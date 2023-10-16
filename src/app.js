import express from "express";
import { pool } from "./db.js";
import { PORT } from "./config.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt"
import http from "http"
import { Server } from 'socket.io';

const app = express();
app.use(express.json());
app.use(cookieParser());
const saltRounds = 10; // Cost factor for bcrypt (may vary)

const server2 = http.createServer(app);

const io = new Server(server2, {
  cors: {
    // origin: "http://localhost:5173",
    origin: "https://proyecto-modular-2.vercel.app"
  },
});

app.use(
  cors({
    // origin: "http://localhost:5173",
    origin: "https://proyecto-modular-2.vercel.app"
    methods: ["POST", "GET", "PUT"],
    credentials: true,
  })
);

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json({ Message: "Necesitas token" });
  } else {
    jwt.verify(token, "prueba", (err, decoded) => {
      if (err) {
        return res.json({ Message: "Error de autenticación" });
      } else {
        req.name = decoded.name;
        next();
      }
    });
  }
};

// app.get('/', async (req, res) => {
//   const [rows] = await pool.query('SELECT * FROM users')
//   res.json(rows)
// })

// app.get('/ping', async (req, res) => {
//   const [result] = await pool.query(`SELECT "hello world" as RESULT`);
//   res.json(result[0])
// })

// app.get('/create', async (req, res) => {
//   const result = await pool.query('INSERT INTO users(name) VALUES ("John")')
//   res.json(result)
// })

app.post("/login", async (req, res) => {
  const username = req.body.name;
  const password = req.body.password;

  const sql = "SELECT * FROM users WHERE username = ?";
  try {
    const [rows, fields] = await pool.query(sql, [username]);
    if (rows.length > 0) {
      const storedHash = rows[0].passwordHash;
      const passwordMatch = await bcrypt.compare(password, storedHash);

      if (passwordMatch) {
        const name = rows[0].username;
        const userLevel = rows[0].userLevel;
        const balance = rows[0].balance;
        const userId = rows[0].userId;

        // Genera un token de autenticación con JWT
        const token = jwt.sign({ name }, "prueba", { expiresIn: "1d" });

        // Configura las cookies con la información del usuario
        res.cookie("token", token);
        res.cookie("level", userLevel);
        res.cookie("name", name);
        res.cookie("balance", balance);
        res.cookie("id", userId);

        return res.json({
          Status: "Success",
          Level: userLevel,
          Name: name,
          Balance: balance,
        });
      } else {
        return res.json({ Message: "Credenciales incorrectas" });
      }
    } else {
      return res.json({ Message: "No existen registros" });
    }
  } catch (error) {
    return res.json({ Message: "Error del lado del servidor" });
  }

  // db.query(sql, [username], async (err, data) => {
  //   if (err) {
  //     return res.json({ Message: "Error del lado del servidor" });
  //   }

  //   if (data.length > 0) {
  //     const storedHash = data[0].passwordHash;

  //     // Compara la contraseña proporcionada con el hash almacenado
  //     const passwordMatch = await bcrypt.compare(password, storedHash);

  //     if (passwordMatch) {
  //       const name = data[0].username;
  //       const userLevel = data[0].userLevel;
  //       const balance = data[0].balance;
  //       const userId = data[0].userId;

  //       // Genera un token de autenticación con JWT
  //       const token = jwt.sign({ name }, "prueba", { expiresIn: "1d" });

  //       // Configura las cookies con la información del usuario
  //       res.cookie("token", token);
  //       res.cookie("level", userLevel);
  //       res.cookie("name", name);
  //       res.cookie("balance", balance);
  //       res.cookie("id", userId);

  //       return res.json({
  //         Status: "Success",
  //         Level: userLevel,
  //         Name: name,
  //         Balance: balance,
  //       });
  //     } else {
  //       return res.json({ Message: "Credenciales incorrectas" });
  //     }
  //   } else {
  //     return res.json({ Message: "No existen registros" });
  //   }
  // });
});

app.get("/seleccionar-datos", async (req, res) => {
  try {
    // Ejecuta una consulta SQL para seleccionar todos los datos de la tabla
    const [resultados, fields] = await pool.query("SELECT * FROM events");

    // Envia los resultados al cliente
    res.json(resultados);

    // Emite los resultados a través de Socket.io para actualizar el cliente
    io.emit("datos_actualizados", resultados);
    console.log("entre");
  } catch (error) {
    console.error("Error al seleccionar los datos:", error);
    res.status(500).json({ error: "Error al seleccionar los datos" });
  }
});


io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.emit("evento_personalizado", { message: "Hola cliente" });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});


const insertData = async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    const hash = await bcrypt.hash(contrasena, saltRounds);
    const sql =
      "INSERT INTO users (username, passwordHash, balance, userLevel, deposit, withdraw) VALUES (?, ?, 0, 1, 0, 0)";
    const values = [correo, hash];

    const [results] = await pool.query(sql, values);
    res.status(200).json({ message: "Datos insertados correctamente" });
  } catch (error) {
    console.error("Error al insertar los datos:", error);
    res.status(500).json({ error: "Error al insertar los datos" });
  }
};


app.post("/insertar", async (req, res) => {
  const {
    eventName,
    eventDate,
    oddsLocalTeam,
    oddsVisitTeam,
    oddsDraw,
    nombreLocal,
    nombreVisitante,
   
  } = req.body;

  const sql =
    "INSERT INTO events ( eventName, eventDate, oddsLocalTeam, oddsVisitTeam, oddsDraw, nombreLocal, nombreVisitante) VALUES (?, ?, ?, ?, ?, ?, ?)";
  
  const values = [
    eventName,
    eventDate,
    oddsLocalTeam,
    oddsVisitTeam,
    oddsDraw,
    nombreLocal,
    nombreVisitante,

  ];

  try {
    // Realizar la inserción de datos usando await y pool.query
    const [insertResult] = await pool.query(sql, values);

    if (insertResult.affectedRows > 0) {
      // La inserción fue exitosa, ahora selecciona los datos y envía una respuesta
      const sqlSelectAll = "SELECT * FROM events";
    

      // Emitir un evento a todos los clientes conectados con todos los datos
      res.redirect("/seleccionar-datos");
    } else {
      res.status(500).json({ error: "Error al insertar los datos" });
    }
  } catch (error) {
    console.error("Error al insertar los datos:", error);
    res.status(500).json({ error: "Error al insertar los datos" });
  }
});


app.post("/registerUser", insertData);

server2.listen(PORT, () => {
  console.log("Servidor en ejecución en el puerto", PORT);
});