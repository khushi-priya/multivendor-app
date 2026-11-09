


const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { User, Shop, ShopMembership } = require("../models");
const { AppError, wrap } = require("../utils/errors");
const { sessionUser } = require("../services/sessionUser");

const DUMMY_HASH = bcrypt.hashSync(
  "not-a-real-password",
  env.bcryptRounds
);

// Existing general login (kept for compatibility).
const login = wrap(async (req, res) => {
  return authenticate(req, res, null);
});

// Customer-only login.
const customerLogin = wrap(async (req, res) => {
  return authenticate(req, res, "customer");
});

// Admin-only login.
const adminLogin = wrap(async (req, res) => {
  return authenticate(req, res, "super_admin");
});

// Shop-owner-only login.
const shopOwnerLogin = wrap(async (req, res) => {
  return authenticate(req, res, "shop_user");
});

async function authenticate(req, res, requiredRole) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password;

  if (!email || typeof password !== "string" || !password) {
    throw new AppError(400, "Email and password are required");
  }

  if (email.length > 190 || password.length > 100) {
    throw new AppError(400, "Invalid email or password");
  }

  const user = await User.unscoped().findOne({
    where: { email },
  });

  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash || DUMMY_HASH
  );

  if (
    !user ||
    !user.passwordHash ||
    !passwordMatches ||
    user.status !== "active"
  ) {
    throw new AppError(401, "Invalid email or password");
  }

  // Check the selected login role BEFORE creating a session.
  if (requiredRole === "customer" && user.role !== "customer") {
    throw new AppError(403, "This sign-in is for customers");
  }

  if (requiredRole === "super_admin" && user.role !== "super_admin") {
    throw new AppError(403, "This sign-in is for administrators");
  }

  if (requiredRole === "shop_user" && user.role !== "shop_user") {
    throw new AppError(403, "This sign-in is for shop owners");
  }

  let payload;

  if (user.role === "shop_user") {
    const memberships = await ShopMembership.findAll({
      where: {
        userId: user.id,
        status: "active",
      },
      include: [
        {
          model: Shop,
          as: "shop",
          attributes: ["id", "name", "status"],
        },
      ],
      limit: 2,
    });

    if (memberships.length !== 1 || !memberships[0].shop) {
      throw new AppError(
        403,
        memberships.length > 1
          ? "This account has multiple active shop assignments. Contact your shop administrator."
          : "No active shop assignment was found."
      );
    }

    const [membership] = memberships;
    if (membership.shop.status !== "active") {
      throw new AppError(403, "This shop is currently suspended");
    }

    payload = await sessionUser(user, membership);
  } else {
    payload = await sessionUser(user);
  }

  if (!req.session) {
    throw new AppError(500, "Session is not configured");
  }

  // Regenerate session to prevent session fixation.
  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  req.session.userId = user.id;

  // Save session before sending response.
  await new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await user.update({ lastLoginAt: new Date() });

  return res.json({ user: payload });
}

const logout = wrap(async (req, res) => {
  if (req.session) {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  res.clearCookie("mv.sid", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
  });

  return res.json({ ok: true });
});

const me = wrap(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const payload = await sessionUser(req.user, req.shopMembership || null);
  return res.json({ user: payload });
});

module.exports = {
  login,
  customerLogin,
  adminLogin,
  shopOwnerLogin,
  logout,
  me,
};
