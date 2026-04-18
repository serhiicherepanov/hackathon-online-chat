# 6. Advanced requirements
If you manage to implement requirements above quickly. Add additional feature: Jabber
protocol support. This should include:
1. Users must be able to connect to the server using Jabber client (choose jabber
protocol support level you can afford)
2. Servers must be able to support federation i.e. messages between servers (this will
require more complicated setup in docker compose)
3. Use jabber library available for your tech stack.
Most advanced possible implementation must include load test for federation of two
servers:
1. 50+ clients connected to one server - A, 50+ to another - B
2. Messaging from A to B and back.
Note: with existing library this feature is rather integration than coding, but with AI agent it
could be challenging.
Also, you must add to server UI screens specific to Jabber
1. Connection dashboard for admin
2. Federation traffic info/statistics
