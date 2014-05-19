#include <fstream>
#include <stdio.h>
#include <stdarg.h>
#include <signal.h>
#include <syslog.h>
#include <sys/stat.h>

#include <amqp.h>
#include <amqp_framing.h>
#include <amqp_tcp_socket.h>
#include <mongo/client/dbclient.h>

std::string compose(const char *&fmt, va_list &args)
{
    char *str = new char[32];
    unsigned int oldSize = 32, size = vsnprintf(str, oldSize, fmt, args);

    for(; size >= oldSize; size = vsnprintf(str, size, fmt, args))
    {
        delete []str;
        str = new char[size];
        oldSize = size;
    }

    std::string s(str);

    delete []str;

    return s;
}

void perform(int x, const char *fmt, ...)
{
    if(0 <= x)
    {
        return;
    }

    va_list ap;
    va_start(ap, fmt);
    std::string error = compose(fmt, ap);
    va_end(ap);

    throw error;
}

void perform(amqp_rpc_reply_t x, const char *fmt, ...)
{
    if(AMQP_RESPONSE_NORMAL == x.reply_type)
    {
        return;
    }

    va_list ap;
    va_start(ap, fmt);
    std::string error = compose(fmt, ap);
    va_end(ap);

    throw error;
}

void eject(const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    std::string error = compose(fmt, ap);
    va_end(ap);

    throw error;
}

static struct
{
    char *file;

    unsigned long seconds;

    struct
    {
        std::string database;
        std::string query;
    } source;

    struct
    {
        std::string hostname;
        unsigned int port;
        std::string vhost;
        std::string username;
        std::string password;
        std::string queue;
    } target;

    std::set<std::string> skip;
} config;

static bool reloadConfig = true, validConfig = false;

std::string configString(const std::map<std::string, std::string> &config, const std::string &name, bool optional = false)
{
    if(!config.count(name))
    {
        if(!optional)
        {
            validConfig = false;
            syslog(LOG_WARNING, "Missing value for field '%s' in config file", name.c_str());
        }

        return "";
    }

    if(!optional && config.at(name).empty())
    {
        validConfig = false;
        syslog(LOG_WARNING, "Missing value for field '%s' in config file", name.c_str());
    }

    return config.at(name);
}

long configLong(const std::map<std::string, std::string> &config, const std::string &name)
{
    return atol(configString(config, name).c_str());
}

static inline std::string &ltrim(std::string &s)
{
    s.erase(s.begin(), std::find_if(s.begin(), s.end(), std::not1(std::ptr_fun<int, int>(std::isspace))));
    return s;
}

void loadConfig()
{
    validConfig = true;

    std::ifstream fs(config.file);

    if(!fs)
    {
        syslog(LOG_ERR, "Cannot read config file");
        validConfig = false;
        return;
    }

    std::map<std::string, std::string> vars;
    std::string line;

    while(std::getline(fs, line))
    {
        ltrim(line);
        if(!line.empty() && ('#' != line[0]))
        {
            size_t equal = line.find_first_of('=');
            if(std::string::npos != equal)
            {
                vars[line.substr(0, equal)] = line.substr(equal + 1);
            }
        }
    }

    config.seconds = configLong(vars, "seconds");
    config.source.database = configString(vars, "database");
    config.source.query = configString(vars, "query");
    config.target.hostname = configString(vars, "hostname");
    config.target.port = configLong(vars, "port");
    config.target.vhost = configString(vars, "vhost");
    config.target.username = configString(vars, "username", true);
    config.target.password = configString(vars, "password", true);
    config.target.queue = configString(vars, "queue");

    if(vars.count("skip"))
    {
        std::istringstream iss(vars["skip"]);

        while(iss)
        {
            std::string s;
            iss >> s;
            config.skip.insert(s);
        }
        config.skip.erase("");
    }

    reloadConfig = false;

    if(!validConfig)
    {
        syslog(LOG_ERR, "Cannot use configuration");
    }
}

bool doJob()
{
    if(reloadConfig)
    {
        loadConfig();
    }

    if(validConfig)
    {
        amqp_socket_t *socket = NULL;
        amqp_connection_state_t conn;

        conn = amqp_new_connection();

        try
        {
            socket = amqp_tcp_socket_new(conn);
            if(!socket)
            {
                eject("Error creating TCP socket");
            }

            if(amqp_socket_open(socket, config.target.hostname.c_str(), config.target.port))
            {
                eject("Error opening TCP socket");
            }

            perform(amqp_login(conn, config.target.vhost.c_str(),
                               0, 131072, 0, AMQP_SASL_METHOD_PLAIN,
                               config.target.username.c_str(),
                               config.target.password.c_str()),
                    "Error logging in");

            amqp_channel_open(conn, 1);
            perform(amqp_get_rpc_reply(conn), "Error opening channel");

            try
            {
                mongo::DBClientConnection c;
                c.connect(config.source.database.c_str());

                std::auto_ptr<mongo::DBClientCursor> cursor = c.query(config.source.query.c_str(), bson::bo());

                while(cursor->more())
                {
                    bson::bo p = cursor->next();
                    bson::bo n = p;

                    for(std::set<std::string>::iterator it = config.skip.begin();
                        it != config.skip.end(); ++it)
                    {
                        n = n.removeField(it->c_str());
                    }

                    std::string msg = n.toString();

                    try
                    {
                        perform(amqp_basic_publish(conn, 1,
                                                   amqp_cstring_bytes("amq.direct"),
                                                   amqp_cstring_bytes(config.target.queue.c_str()),
                                                   false, false, NULL,
                                                   amqp_cstring_bytes(&msg[0])),
                                "Error publishing a message");
                    }
                    catch(const std::string &e)
                    {
                        syslog(LOG_WARNING, "%s", e.c_str());
                    }

                    c.remove(config.source.query.c_str(), QUERY("_id" << p.getField("_id")));
                }
            }
            catch(const mongo::DBException &e)
            {
                syslog(LOG_ERR, "DBException: %s", e.what());
            }

            amqp_channel_close(conn, 1, AMQP_REPLY_SUCCESS);
            amqp_connection_close(conn, AMQP_REPLY_SUCCESS);
        }
        catch(const std::string &e)
        {
            syslog(LOG_ERR, "%s", e.c_str());
        }
        catch(...)
        {
            syslog(LOG_ERR, "Unknown exception");
        }

        amqp_destroy_connection(conn);
    }
    else // !validConfig
    {
        return false;
    }

    return true;
}

void ignore(int) { }

void runAsDaemon()
{
    pid_t pid = fork();

    if(pid < 0)
    {
        exit(EXIT_FAILURE);
    }

    if(pid > 0)
    {
        exit(EXIT_SUCCESS);
    }

    if(setsid() < 0)
    {
        exit(EXIT_FAILURE);
    }

    signal(SIGCHLD, SIG_IGN);
    signal(SIGTERM, ignore);
    signal(SIGHUP, ignore);

    pid = fork();

    if(pid < 0)
    {
        exit(EXIT_FAILURE);
    }

    if (pid > 0)
    {
        exit(EXIT_SUCCESS);
    }

    umask(0);
    chdir("/");

    for(int x = sysconf(_SC_OPEN_MAX); x > 0; x--)
    {
        close(x);
    }

    openlog("wabbit", LOG_PID, LOG_DAEMON);
}

int main(int argc, char *argv[])
{
    if(argc < 2)
    {
        fprintf(stderr, "Please specify a config file as an additional parameter\n");
        exit(EXIT_FAILURE);
    }

    runAsDaemon();

    config.file = argv[1];

    loadConfig();

    if(!validConfig)
    {
        exit(EXIT_FAILURE);
    }

    syslog(LOG_NOTICE, "Started");

    bool running = true;
    sigset_t sigset;
    errno = 0;

    if(sigemptyset(&sigset))
    {
        syslog(LOG_CRIT, "sigemptyset failed (errno %u)", static_cast<unsigned int>(errno));
        running = false;
    }

    if(running)
    {
        if(sigaddset(&sigset, SIGTERM))
        {
            syslog(LOG_CRIT, "sigaddset(SIGTERM) failed (errno %u)", static_cast<unsigned int>(errno));
            running = false;
        }
    }

    if(running)
    {
        if(sigaddset(&sigset, SIGHUP))
        {
            syslog(LOG_CRIT, "sigaddset(SIGHUP) failed (errno %u)", static_cast<unsigned int>(errno));
            running = false;
        }
    }

    int signal;
    timespec refresh;

    for(; running; errno = 0)
    {
        refresh.tv_sec = config.seconds;
        signal = sigtimedwait(&sigset, 0, &refresh);

        switch(signal)
        {
        case -1:
            if(EAGAIN == errno)
            {
                running = doJob();
            }
            else
            {
                syslog(LOG_CRIT, "sigtimedwait failed (errno %u)", static_cast<unsigned int>(errno));
                running = false;
            }
            break;

        case SIGTERM:
            syslog(LOG_INFO, "Received SIGTERM, stopping");
            running = false;
            break;

        case SIGHUP:
            syslog(LOG_INFO, "Received SIGHUP, will reload config");
            reloadConfig = true;
            break;

        default:
            syslog(LOG_CRIT, "sigtimedwait unexpected return value %d (errno %u)", signal, static_cast<unsigned int>(errno));
            running = false;
            break;
        }
    }

    syslog(LOG_NOTICE, "Stopped");

    return EXIT_SUCCESS;
}
