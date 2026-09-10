import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { setIO } from "./src/lib/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? `http://${hostname}:${port}` },
  });
  setIO(io);

  io.on("connection", (socket) => {
    socket.on("slots:subscribe", (room: string) => {
      if (typeof room === "string" && room.startsWith("slots:")) {
        socket.join(room);
      }
    });
    socket.on("slots:unsubscribe", (room: string) => {
      if (typeof room === "string") socket.leave(room);
    });
  });

  const sweepHolds = async () => {
    const { releaseExpiredHolds } = await import("./src/lib/holds");
    try {
      await releaseExpiredHolds();
    } catch (error) {
      console.error("Hold sweep failed", error);
    }
  };

  const refillSlots = async () => {
    const { generateSlotsForWindow } = await import("./src/lib/slots");
    try {
      await generateSlotsForWindow();
    } catch (error) {
      console.error("Slot generation failed", error);
    }
  };

  sweepHolds();
  refillSlots();
  setInterval(sweepHolds, 15_000);
  setInterval(refillSlots, 60 * 60 * 1000);

  httpServer.listen(port, () => {
    console.log(`Ridgeway PT ready on http://${hostname}:${port}`);
  });
});
