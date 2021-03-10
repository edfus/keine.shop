import { SMTPServer } from "smtp-server";

// This example starts a SMTP server using TLS with your own certificate and key
const server = new SMTPServer({
  name: "keine.shop",
  banner: "greetings",
  authMethods: ['PLAIN', 'LOGIN'],
  // secure: true,
  // key: fs.readFileSync("private.key"),
  // cert: fs.readFileSync("server.crt")
  onAuth(auth, session, callback) {
    console.log("onAuth", arguments);
    if (auth.username !== "abc" || auth.password !== "def") {
      return callback(new Error("Invalid username or password"));
    }
    callback(null, { user: 123 }); // where 123 is the user id or similar property
  },
  onConnect(session, callback) {
    if (session.remoteAddress === "127.0.0.1") {
      return callback(new Error("No connections from localhost allowed"));
    }
    return callback(); // Accept the connection
  },
  onRcptTo(address, session, callback) {
    if (address.address !== "allowed@example.com") {
      return callback(
        new Error("Only allowed@example.com is allowed to receive mail")
      );
    }
    return callback(); // Accept the address
  },
  size: 1024 * 4, // allow messages up to 4 kb
  onData(stream, session, callback) {
    "Received: ".concat(new Date().toISOString())
    stream.pipe(process.stdout); // print message to console
    stream.on("end", () => {
      if (stream.sizeExceeded) {
        const err = new Error("Message exceeds fixed maximum message size");
        err.responseCode = 552;
        return callback(err);
      }
      callback(null, "Message queued as abcdef");
    });
    
    session.user
    session.clientHostname 

    session.envelope.rcptTo[0]
  }
}).listen(465);

// server.close();

// https://nodemailer.com/extras/smtp-server/