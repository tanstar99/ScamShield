import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "./models/user.models.js";
import bcrypt from "bcryptjs";

const users = [
  // ─── Rishabh Jain (Primary) ───────────────────────────────────
  {
    name: "Rishabh Jain",
    email: "jainrishabh2610@gmail.com",
    password: "password123",
    phone: "918433943227"
  },

  // ─── Sahil Shirke ─────────────────────────────────────────────
  {
    name: "Sahil Shirke",
    email: "sahil.s2423@gmail.com",
    password: "password123",
    phone: "919930709904"
  },

  // ─── Tanish Raigandhi ─────────────────────────────────────────
  {
    name: "Tanish Raigandhi",
    email: "tanish99yt@gmail.com",
    password: "password123",
    phone: "918764494969"
  },

  // ─── Aaditya Benke ────────────────────────────────────────────
  {
    name: "Aaditya Benke",
    email: "aaditybenke@gmail.com",
    password: "password123",
    phone: "917021127964"
  },
  {
    name: "Aaditya Benke",
    email: "ab@gmail.com",
    password: "password123",
    phone: "917021127964"
  },

  // ─── Aarjav Jain ──────────────────────────────────────────────
  {
    name: "Aarjav Jain",
    email: "aarjav.n.jain205@gmail.com",
    password: "password123",
    phone: "918591768921"
  },
  {
    name: "Aarjav Jain",
    email: "aaj@gmail.com",
    password: "password123",
    phone: "918591768921"
  },

  // ─── Atharva Jadhav ───────────────────────────────────────────
  {
    name: "Atharva Jadhav",
    email: "atharvai2005@gmail.com",
    password: "password123",
    phone: "917387241068"
  },
  {
    name: "Atharva Jadhav",
    email: "aj@gmail.com",
    password: "password123",
    phone: "917387241068"
  }
];

// ─── MongoDB Connection ───────────────────────────────────────────

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("✅ DB Connected for seeding users");
    seedUsers();
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  });

// ─── Seed Users Function ──────────────────────────────────────────

const seedUsers = async () => {
  try {
    console.log("🔄 Clearing existing users...");
    await User.deleteMany({});
    console.log("✅ Existing users cleared");

    // Hash passwords
    console.log("🔄 Hashing passwords...");
    const saltRounds = 12;
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        return { ...user, password: hashedPassword };
      })
    );

    console.log("🔄 Inserting users into database...");
    const result = await User.insertMany(hashedUsers);
    
    console.log("\n✅ Users seeded successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 SEEDED USERS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    result.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Password: password123`);
      console.log(`   ID: ${user._id}\n`);
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Total users seeded: ${result.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("❌ Error seeding users:", error.message);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};