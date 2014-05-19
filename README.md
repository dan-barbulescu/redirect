redirect
========

A simple redirect service

Requires
--------

Node.js, MongoDB

Getting started
---------------

1. Get dependencies

    In  _./node_:
    > npm install

2. Make a copy of _./node/server.config_ and edit it

    __port__ = port on which the server will be listening
    
    __name__ = hostname; _localhost_ will NOT work
    
    __db__   = MongoDB connection string 

3. Add a set of login credentials

    In  _./node_:
    > nodejs -e "require('mongoose').connect('database'); require('./auth.js').create('username', 'password');"
    
4. Run the server
    > nodejs server.js \<your.config\>

    You may require root priviledges if you're listening on a port < 1024 (e.g. 80)

5. Log on
    > http://admin\.\<name.of.server\>[:\<port\>]/

6. Create/edit/delete redirects

    Each redirect has a hex code

7. Try them out
    > http://\<name.of.server\>[:\<port\>]/\<code\>

    If no code is specified, a random one will be used

8. Have fun!

wabbit
======

A lightweight daemon that forwards data from MongoDB to RabbitMQ

Requires
--------

boost, [MongoDB C++ Driver](https://github.com/mongodb/mongo-cxx-driver) (26compat), [RabbitMQ C AMQP client library](https://github.com/alanxz/rabbitmq-c)

Getting started
---------------

1. Get dependencies, compile dependencies

2. Compile _main.cpp_

    Remember to set the lib and include paths to include the dependencies if you haven't installed them for system-wide availability
    
3. Make a copy of _./wabbit/wabbit.config_ and edit it

    __seconds__ = how often to check and forward data, if any

    __database__ = MongoDB host
    
    __query__ = MongoDB collection (e.g. \<database\>.\<collection\>)

    __hostname__, __port__ = RabbitMQ server
    
    __vhost__ = RabbitMQ vhost name
    
    __username__, __password__ = optional, RabbitMQ login credentials
    
    __queue__ = RabbitMQ queue name

    __skip__ = optional, fields to skip when forwading data, whitespace-separated

4. Start wabbit

    > ./wabbit \<your.config\>
    
    You can run as many instances as you want; it would be a good idea to have different config files for them
    
    You can check for errors in the system log:
    
    > grep wabbit /var/log/syslog

    Configuration errors are non-recoverable; other errors will NOT prevent it from running and attempting to forward data with the set frequency
    
5. Control wabbit

    > killall -SIGHUP wabbit
    
    HUP will cause wabbit to reload the configuration file; same as above, a config error will cause it to stop

    > killall -SIGTERM wabbit
    
    TERM will cause wabbit to stop gracefully as soon as possible
