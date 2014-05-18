redirect
========

A simple redirect service

Requires: Node.js, MongoDB

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
