import express from "express";
import { pool } from "./db.js";
import { PORT } from "./config.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt"
import http from "http"
import { Server } from 'socket.io';
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cookieParser());
const saltRounds = 10; // Cost factor for bcrypt (may vary)

const server2 = http.createServer(app);

const io = new Server(server2, {
  cors: {
    //  origin: "http://localhost:5173",
      origin: "https://proyecto-modular-2.vercel.app"
  },
});

app.use(
  cors({
    //  origin: "http://localhost:5173",
    origin: "https://proyecto-modular-2.vercel.app",
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

      console.log(rows)


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
          id:userId,
          token:token
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
app.get("/credits", async (req, res) => {
  try {
    const id = req.query.id; // Cambiado de req.body.id a req.query.id


  //   // Ejecuta una consulta SQL segura para seleccionar el balance de un usuario por su ID
   const [resultados, fields] = await pool.query("SELECT balance from users where userId=?", [id]);

    // Verifica si se encontraron resultados
    if (resultados.length > 0) {
      res.json(resultados[0]); // Envía el primer resultado (debería ser único) al cliente
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  } catch (error) {
    console.error("Error al seleccionar los datos:", error);
    res.status(500).json({ error: "Error al seleccionar los datos" });
  }
});


app.get("/paymethod", async (req, res) => {
  try {
    const id = req.query.id; // Cambiado de req.body.id a req.query.id


  //   // Ejecuta una consulta SQL segura para seleccionar el balance de un usuario por su ID
   const [resultados, fields] = await pool.query("SELECT paymethod from users where userId=?", [id]);

    // Verifica si se encontraron resultados
    if (resultados.length > 0) {
      res.json(resultados[0]); // Envía el primer resultado (debería ser único) al cliente
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  } catch (error) {
    console.error("Error al seleccionar los datos:", error);
    res.status(500).json({ error: "Error al seleccionar los datos" });
  }
});

app.get("/logout", (req, res) => {
    console.log("entr22e")
    res.clearCookie("token");
    res.clearCookie("name");
    res.clearCookie("balance");
    res.clearCookie("level");
    return res.json({ Status: "Success" });
});



app.get("/seleccionar-datos/:tipo", async (req, res) => {
  try {
    const tipo = req.params.tipo; // Accede al valor del parámetro "tipo" desde la URL

    // Ejecuta una consulta SQL para seleccionar datos basados en el valor de "tipo"
    const [resultados, fields] = await pool.query("SELECT * FROM events WHERE deporte = ?", [tipo]);

    // Envía los resultados al cliente
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

app.get("/seleccionarApuestas/:id", async (req, res) => {
  try {
    const userId = req.params.id; // Accede al valor del parámetro "id" desde la URL

    // Ejecuta una consulta SQL con INNER JOIN
    const [resultados, fields] = await pool.query(
      "SELECT bets.*, events.* FROM bets INNER JOIN events ON bets.eventId = events.eventId WHERE bets.userId = ?",
      [userId]
    );

    // Envía los resultados al cliente
    res.json(resultados);

    // Emite los resultados a través de Socket.io para actualizar el cliente
    io.emit("datos_actualizados", resultados);
    console.log("entre");
  } catch (error) {
    console.error("Error al seleccionar los datos:", error);
    res.status(500).json({ error: "Error al seleccionar los datos" });
  }
});




app.post("/insertar", async (req, res) => {
  const {
    eventName,
    eventDate,
    oddsLocalTeam,
    oddsVisitTeam,
    oddsDraw,
    nombreLocal,
    nombreVisitante,
    deporte

  } = req.body;

  const sql =
    "INSERT INTO events ( eventName, eventDate, oddsLocalTeam, oddsVisitTeam, oddsDraw, nombreLocal, nombreVisitante, deporte) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

  const values = [
    eventName,
    eventDate,
    oddsLocalTeam,
    oddsVisitTeam,
    oddsDraw,
    nombreLocal,
    nombreVisitante,
    deporte

  ];

  try {
    // Realizar la inserción de datos usando await y pool.query
    const [insertResult] = await pool.query(sql, values);

    if (insertResult.affectedRows > 0) {
      // La inserción fue exitosa, ahora selecciona los datos y envía una respuesta
      const sqlSelectAll = "SELECT * FROM events";


      // Emitir un evento a todos los clientes conectados con todos los datos
      res.redirect("/seleccionar-datos/"+deporte);
    } else {
      res.status(500).json({ error: "Error al insertar los datos" });
    }
  } catch (error) {
    console.error("Error al insertar los datos:", error);
    res.status(500).json({ error: "Error al insertar los datos" });
  }
});


app.put("/actualizarMetodoPago", async (req, res) => {
  const {
    saldo, userId
  } = req.body;

  const sql = "UPDATE users SET balance = ? WHERE userId = ?";
  const values = [saldo,userId];

  try {
    const [updateResult] = await pool.query(sql, values);

    if (updateResult.affectedRows > 0) {
      res.status(200).json({ status: "OK" });
    } else {
      res.status(500).json({ error: "Error al actualizar los datos" });
    }
  } catch (error) {
    console.error("Error al actualizar los datos:", error);
    res.status(500).json({ error: "Error al actualizar los datos" });
  }
});
const insertApuesta = async (req, res) => {
  const { userId, eventId, amount, outcome, saldo } = req.body;
  const sql = "INSERT INTO bets (userId, eventId, amount, outcome, result) VALUES (?, ?, ?, ?,'En proceso')";
  const values = [userId, eventId, amount, outcome];
let nuevaCantidad
  try {
    const result = await pool.query(sql, values);
    const saldo = parseFloat(req.body.saldo); // O parseInt si se espera un número entero
    const amount = parseFloat(req.body.amount); // O parseInt si se espera un número entero

    if (!isNaN(saldo) && !isNaN(amount)) {
       nuevaCantidad = saldo - amount;
      await updateBalance(userId, nuevaCantidad);
    } else {
      console.error("Saldo o amount no son números válidos");
      // Manejar el error o devolver una respuesta adecuada
    }
    res.status(200).json({ message: "Apuesta agregada" , prueba: nuevaCantidad});
  } catch (error) {
    
    console.error("Error al insertar los datos:", error);
    res.status(500).json({ error: "Error al insertar los datos" });
  }
};


async function updateBalance(userId, newBalance) {
  try {
    const updateSql = "UPDATE users SET balance = ? WHERE userId = ?";
    const updateValues = [newBalance, userId];
    await pool.query(updateSql, updateValues);
    console.log("Saldo actualizado correctamente");
  } catch (error) {
    console.error("Error al actualizar el saldo:", error);
  }
}

app.put("/updateBalance/:userId", (req, res) => {
  const userId = req.params.userId;
  const newBalance = req.body.newBalance;

  // Lógica de actualización de saldo aquí

  res.status(200).json({ message: "Saldo actualizado correctamente" });
});
app.post("/insertApuesta", async (req, res) => {
  try {
    await insertApuesta(req, res);
  } catch (error) {
    console.error("Error en la ruta /insertApuesta:", error);
    res.status(500).json({ error: "Error en la ruta /insertApuesta" });
  }
});


app.post("/insertApuesta", insertApuesta);


app.post("/registerUser", insertData);

server2.listen(PORT, () => {
  console.log("Servidor en ejecución en el puerto", PORT);
});
