// const router = require('express').Router();
// const bcrypt = require('bcryptjs');
// const rateLimit = require('express-rate-limit');
// const env = require('../config/env');
// const { sequelize, User, AuthToken } = require('../models');
// const { AppError, wrap } = require('../utils/errors');
// const { validate, z, password, phone, optional } = require('../utils/validate');
// const { requireAuth } = require('../middleware/auth');
// const { sessionUser } = require('../services/sessionUser');
// const { issueToken, findValidToken, issueEmailOtp,
//   verifyEmailOtp, resetLink, RESET_TTL } = require('../services/tokens');
// const { sendMail } = require('../utils/mailer');
// const { audit } = require('../utils/audit');
// const authController = require('../controllers/authController');

// const limiter = (limit) =>
//   rateLimit({
//     windowMs: 15 * 60 * 1000,
//     limit: env.isTest ? 1000 : limit,
//     standardHeaders: true,
//     legacyHeaders: false,
//     message: { error: 'Too many attempts. Please try again later.' },
//   });

// const loginSchema = z.object({
//   email: z.string().trim().toLowerCase().email().max(190),
//   password: z.string().min(1).max(100),
// });

// // router.post('/login', limiter(20), validate(loginSchema), authController.login);
// // router.post('/shop-owner/login', limiter(20), validate(loginSchema), authController.shopOwnerLogin);
// // router.post('/logout', authController.logout);
// // router.get('/me', requireAuth, authController.me);

// router.post('/login', limiter(20), validate(loginSchema), authController.login);

// router.post(
//   '/customer/login',
//   limiter(20),
//   validate(loginSchema),
//   authController.customerLogin
// );

// router.post(
//   '/admin/login',
//   limiter(20),
//   validate(loginSchema),
//   authController.adminLogin
// );

// router.post(
//   '/shop-owner/login',
//   limiter(20),
//   validate(loginSchema),
//   authController.shopOwnerLogin
// );

// router.post('/logout', authController.logout);
// router.get('/me', requireAuth, authController.me);


// const registerSchema = z.object({
//   name: z.string().trim().min(2, 'Name is required').max(120),
//   email: z.string().trim().toLowerCase().email('Enter a valid email').max(190),
//   password,
//   phone: optional(phone),
// });

// // Customer registration
// router.post(
//   '/register',
//   limiter(10),
//   validate(registerSchema),
//   wrap(async (req, res) => {
//     const { name, email, password: pw, phone: ph } = req.valid;

//     const existing = await User.unscoped().findOne({
//       where: { email },
//     });

//     if (existing) {
//       throw new AppError(
//         409,
//         'An account with this email already exists.'
//       );
//     }

//     const hash = await bcrypt.hash(pw, env.bcryptRounds);

//     const user = await User.create({
//       name,
//       email,
//       phone: ph || null,
//       passwordHash: hash,
//       role: 'customer',
//       status: 'active',
//       emailVerifiedAt: null,
//     });

//     const otp = await issueEmailOtp(user.id);

//     try {
//       await sendMail({
//         to: email,
//         subject: 'Verify your Multivendor account',
//         text:
//           `Your email verification OTP is ${otp}.\n\n` +
//           'This OTP expires in 10 minutes. Do not share it with anyone.',
//         html: `
//           <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
//             <h2>Verify your email address</h2>
//             <p>Thank you for registering with Multivendor Platform.</p>
//             <p>Your verification OTP is:</p>
//             <h1 style="letter-spacing:8px;color:#4f46e5">${otp}</h1>
//             <p>This OTP expires in 10 minutes.</p>
//             <p>If you did not create this account, you can ignore this email.</p>
//           </div>
//         `,
//       });
//     } catch (error) {
//       console.error('[mail] Registration OTP failed:', error.message);

//       throw new AppError(
//         503,
//         'Your account was created, but the verification email could not be sent. Please use Resend OTP.'
//       );
//     }

//     await audit({
//       actorId: user.id,
//       action: 'customer.registered',
//       entityType: 'user',
//       entityId: user.id,
//       ip: req.ip,
//     });

//     // Important: Do not create a session or log the customer in here.
//     res.status(201).json({
//       message: 'Verification OTP sent to your email address.',
//       email: user.email,
//     });
//   }),
// );


// // Verify customer email OTP
// const verifyEmailSchema = z.object({
//   email: z.string().trim().toLowerCase().email().max(190),
//   otp: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit OTP'),
// });

// router.post(
//   '/verify-email',
//   limiter(8),
//   validate(verifyEmailSchema),
//   wrap(async (req, res) => {
//     const { email, otp } = req.valid;

//     const user = await User.unscoped().findOne({
//       where: {
//         email,
//         role: 'customer',
//       },
//     });

//     if (!user) {
//       throw new AppError(400, 'Invalid or expired OTP.');
//     }

//     if (user.emailVerifiedAt) {
//       return res.json({
//         message: 'Your email is already verified. Please sign in.',
//       });
//     }

//     const valid = await verifyEmailOtp(user.id, otp);

//     if (!valid) {
//       throw new AppError(
//         400,
//         'Invalid or expired OTP. Please check the code and try again.'
//       );
//     }

//     await user.update({
//       emailVerifiedAt: new Date(),
//     });

//     await audit({
//       actorId: user.id,
//       action: 'customer.email_verified',
//       entityType: 'user',
//       entityId: user.id,
//       ip: req.ip,
//     });

//     // Verification does not create a login session.
//     res.json({
//       message: 'Email verified successfully. You can now sign in.',
//     });
//   }),
// );


// // Resend customer verification OTP
// const resendVerificationSchema = z.object({
//   email: z.string().trim().toLowerCase().email().max(190),
// });

// router.post(
//   '/resend-verification',
//   limiter(5),
//   validate(resendVerificationSchema),
//   wrap(async (req, res) => {
//     const { email } = req.valid;

//     const genericMessage =
//       'If your account needs verification, a new OTP has been sent.';

//     const user = await User.unscoped().findOne({
//       where: {
//         email,
//         role: 'customer',
//       },
//     });

//     if (!user || user.emailVerifiedAt) {
//       return res.json({ message: genericMessage });
//     }

//     const otp = await issueEmailOtp(user.id);

//     try {
//       await sendMail({
//         to: user.email,
//         subject: 'Your new Multivendor verification OTP',
//         text:
//           `Your new verification OTP is ${otp}.\n\n` +
//           'This OTP expires in 10 minutes.',
//         html: `
//           <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
//             <h2>Email verification</h2>
//             <p>Your new verification OTP is:</p>
//             <h1 style="letter-spacing:8px;color:#4f46e5">${otp}</h1>
//             <p>This OTP expires in 10 minutes.</p>
//           </div>
//         `,
//       });
//     } catch (error) {
//       console.error('[mail] Resend OTP failed:', error.message);

//       throw new AppError(
//         503,
//         'Unable to send the verification email right now. Please try again later.'
//       );
//     }

//     res.json({ message: genericMessage });
//   }),
// );
// // Customer Registration
// router.post(
//   '/register',
//   limiter(10),
//   validate(registerSchema),
//   wrap(async (req, res) => {
//     const { name, email, password: pw, phone: ph } = req.valid;

//     // Check whether email already exists
//     const existing = await User.unscoped().findOne({
//       where: { email },
//     });

//     if (existing) {
//       throw new AppError(
//         409,
//         'An account with this email already exists.'
//       );
//     }

//     // Hash password
//     const hash = await bcrypt.hash(pw, env.bcryptRounds);

//     // Create customer without verifying email
//     const user = await User.create({
//       name,
//       email,
//       phone: ph || null,
//       passwordHash: hash,
//       role: 'customer',
//       status: 'active',
//       emailVerifiedAt: null,
//     });

//     // Generate 6-digit OTP
//     const otp = await issueEmailOtp(user.id);

//     // Send OTP to customer's email
//     try {
//       await sendMail({
//         to: user.email,
//         subject: 'Verify your Multivendor account',

//         text:
//           `Your email verification OTP is ${otp}.\n\n` +
//           'This OTP expires in 10 minutes. Do not share it with anyone.',

//         html: `
//           <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
//             <h2>Verify your email address</h2>

//             <p>Thank you for registering with Multivendor Platform.</p>

//             <p>Your verification OTP is:</p>

//             <h1 style="letter-spacing:8px;color:#4f46e5">
//               ${otp}
//             </h1>

//             <p>This OTP expires in 10 minutes.</p>

//             <p>Please do not share this OTP with anyone.</p>
//           </div>
//         `,
//       });
//     } catch (error) {
//       console.error('[mail] Registration OTP failed:', error.message);

//       throw new AppError(
//         503,
//         'Your account was created, but the verification email could not be sent. Please use Resend OTP.'
//       );
//     }

//     // Audit registration
//     await audit({
//       actorId: user.id,
//       action: 'customer.registered',
//       entityType: 'user',
//       entityId: user.id,
//       ip: req.ip,
//     });

//     // Do not create a session or log in the customer
//     return res.status(201).json({
//       message: 'Verification OTP sent to your email address.',
//       email: user.email,
//     });
//   }),
// );


// // Resend Customer Verification OTP
// router.post(
//   '/resend-verification',
//   limiter(5),
//   validate(resendVerificationSchema),
//   wrap(async (req, res) => {
//     const { email } = req.valid;

//     const genericMessage =
//       'If your account needs verification, a new OTP has been sent.';

//     const user = await User.unscoped().findOne({
//       where: {
//         email,
//         role: 'customer',
//       },
//     });

//     if (!user || user.emailVerifiedAt) {
//       return res.json({ message: genericMessage });
//     }

//     const otp = await issueEmailOtp(user.id);

//     try {
//       await sendMail({
//         to: user.email,
//         subject: 'Your new Multivendor verification OTP',

//         text:
//           `Your new verification OTP is ${otp}.\n\n` +
//           'This OTP expires in 10 minutes.',

//         html: `
//           <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
//             <h2>Email verification</h2>

//             <p>Your new verification OTP is:</p>

//             <h1 style="letter-spacing:8px;color:#4f46e5">
//               ${otp}
//             </h1>

//             <p>This OTP expires in 10 minutes.</p>
//           </div>
//         `,
//       });
//     } catch (error) {
//       console.error('[mail] Resend OTP failed:', error.message);

//       throw new AppError(
//         503,
//         'Unable to send the verification email right now. Please try again later.'
//       );
//     }

//     return res.json({
//       message: genericMessage,
//     });
//   }),
// );
// const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email().max(190) });

// router.post(
//   '/forgot-password',
//   limiter(10),
//   validate(forgotSchema),
//   wrap(async (req, res) => {
//     const generic = { message: 'If an account exists for that email, a reset link has been sent.' };
//     const user = await User.findOne({ where: { email: req.valid.email } });
//     if (user && user.status !== 'disabled') {
//       try {
//         const raw = await issueToken(user.id, 'password_reset', RESET_TTL);
//         const link = resetLink(raw);
//         await sendMail({
//           to: user.email,
//           subject: 'Reset your password',
//           text: `Use this link to choose a new password. It expires in 1 hour and works once.\n\n${link}\n`,
//           html: `<p>Use the link below to choose a new password. It expires in 1 hour and works once.</p><p><a href="${link}">Reset password</a></p>`,
//         });
//       } catch (e) {
//         console.error(`[mail] Reset email failed: ${e.message}`);
//       }
//     }
//     res.json(generic);
//   }),
// );

// const resetSchema = z.object({ token: z.string().min(32).max(200), password });

// // Handles both first-time account setup (invited owners) and password reset.
// router.post(
//   '/reset-password',
//   limiter(10),
//   validate(resetSchema),
//   wrap(async (req, res) => {
//     const { token: raw, password: newPassword } = req.valid;
//     const hash = await bcrypt.hash(newPassword, env.bcryptRounds);

//     await sequelize.transaction(async (t) => {
//       const token = await findValidToken(raw, t);
//       if (!token) throw new AppError(400, 'This link is invalid or has expired. Please request a new one.');
//       const user = await User.unscoped().findByPk(token.userId, { transaction: t, lock: t.LOCK.UPDATE });
//       if (!user || user.status === 'disabled') throw new AppError(400, 'This link is invalid or has expired.');

//       await user.update(
//         { passwordHash: hash, status: 'active', emailVerifiedAt: user.emailVerifiedAt || new Date() },
//         { transaction: t },
//       );
//       await AuthToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null }, transaction: t });
//       await audit({ actorId: user.id, action: token.type === 'account_setup' ? 'auth.account_setup' : 'auth.password_reset', entityType: 'user', entityId: user.id, ip: req.ip }, t);
//     });

//     res.json({ message: 'Password updated. You can now sign in.' });
//   }),
// );

// module.exports = router;


const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const env = require('../config/env');
const { sequelize, User, AuthToken } = require('../models');

const { AppError, wrap } = require('../utils/errors');
const {
  validate,
  z,
  password,
  phone,
  optional,
} = require('../utils/validate');

const { requireAuth } = require('../middleware/auth');

const {
  issueToken,
  findValidToken,
  issueEmailOtp,
  verifyEmailOtp,
  resetLink,
  RESET_TTL,
} = require('../services/tokens');

const { sendMail } = require('../utils/mailer');
const { audit } = require('../utils/audit');
const authController = require('../controllers/authController');


// --------------------------------------------------
// RATE LIMITER
// --------------------------------------------------

const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.isTest ? 1000 : limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many attempts. Please try again later.',
    },
  });


// --------------------------------------------------
// LOGIN VALIDATION
// --------------------------------------------------

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
  password: z.string().min(1).max(100),
});


// --------------------------------------------------
// LOGIN ROUTES
// --------------------------------------------------

router.post(
  '/login',
  limiter(20),
  validate(loginSchema),
  authController.login
);

router.post(
  '/customer/login',
  limiter(20),
  validate(loginSchema),
  authController.customerLogin
);

router.post(
  '/admin/login',
  limiter(20),
  validate(loginSchema),
  authController.adminLogin
);

router.post(
  '/shop-owner/login',
  limiter(20),
  validate(loginSchema),
  authController.shopOwnerLogin
);


// --------------------------------------------------
// LOGOUT AND CURRENT USER
// --------------------------------------------------

router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.me);


// --------------------------------------------------
// CUSTOMER REGISTRATION VALIDATION
// --------------------------------------------------

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),

  email: z.string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .max(190),

  password,

  phone: optional(phone),
});


// --------------------------------------------------
// CUSTOMER REGISTRATION
// Creates account and sends OTP.
// Does NOT create a login session.
// --------------------------------------------------

router.post(
  '/register',
  limiter(10),
  validate(registerSchema),
  wrap(async (req, res) => {
    const {
      name,
      email,
      password: pw,
      phone: ph,
    } = req.valid;

    // Check whether email already exists.
    const existing = await User.unscoped().findOne({
      where: { email },
    });

    if (existing) {
      throw new AppError(
        409,
        'An account with this email already exists.'
      );
    }

    // Hash password.
    const hash = await bcrypt.hash(
      pw,
      env.bcryptRounds
    );

    // Create unverified customer.
    const user = await User.create({
      name,
      email,
      phone: ph || null,
      passwordHash: hash,
      role: 'customer',
      status: 'active',
      emailVerifiedAt: null,
    });

    // Generate six-digit OTP.
    const otp = await issueEmailOtp(user.id);

    // Send verification email.
    try {
      await sendMail({
        to: user.email,
        subject: 'Verify your Multivendor account',

        text:
          `Your email verification OTP is ${otp}.\n\n` +
          'This OTP expires in 10 minutes. Do not share it with anyone.',

        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
            <h2>Verify your email address</h2>

            <p>Thank you for registering with Multivendor Platform.</p>

            <p>Your verification OTP is:</p>

            <h1 style="letter-spacing:8px;color:#4f46e5">
              ${otp}
            </h1>

            <p>This OTP expires in 10 minutes.</p>

            <p>Please do not share this OTP with anyone.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error(
        '[mail] Registration OTP failed:',
        error.message
      );

      throw new AppError(
        503,
        'Your account was created, but the verification email could not be sent. Please use Resend OTP.'
      );
    }

    // Audit registration.
    await audit({
      actorId: user.id,
      action: 'customer.registered',
      entityType: 'user',
      entityId: user.id,
      ip: req.ip,
    });

    // No session creation here.
    return res.status(201).json({
      message: 'Verification OTP sent to your email address.',
      email: user.email,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  })
);


// --------------------------------------------------
// VERIFY EMAIL VALIDATION
// --------------------------------------------------

const verifyEmailSchema = z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .email()
    .max(190),

  otp: z.string().regex(
    /^\d{6}$/,
    'Enter a valid 6-digit OTP'
  ),
});


// --------------------------------------------------
// VERIFY CUSTOMER EMAIL OTP
// --------------------------------------------------

router.post(
  '/verify-email',
  limiter(8),
  validate(verifyEmailSchema),
  wrap(async (req, res) => {
    const { email, otp } = req.valid;

    const user = await User.unscoped().findOne({
      where: {
        email,
        role: 'customer',
      },
    });

    if (!user) {
      throw new AppError(
        400,
        'Invalid or expired OTP.'
      );
    }

    if (user.emailVerifiedAt) {
      return res.json({
        message: 'Your email is already verified. Please sign in.',
      });
    }

    // Check OTP and its expiry/attempt limit.
    const valid = await verifyEmailOtp(user.id, otp);

    if (!valid) {
      throw new AppError(
        400,
        'Invalid or expired OTP. Please check the code and try again.'
      );
    }

    // Mark customer email as verified.
    await user.update({
      emailVerifiedAt: new Date(),
    });

    // Audit verification.
    await audit({
      actorId: user.id,
      action: 'customer.email_verified',
      entityType: 'user',
      entityId: user.id,
      ip: req.ip,
    });

    // Do not log the customer in.
    return res.json({
      message: 'Email verified successfully. You can now sign in.',
    });
  })
);


// --------------------------------------------------
// RESEND OTP VALIDATION
// --------------------------------------------------

const resendVerificationSchema = z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .email()
    .max(190),
});


// --------------------------------------------------
// RESEND CUSTOMER VERIFICATION OTP
// --------------------------------------------------

router.post(
  '/resend-verification',
  limiter(5),
  validate(resendVerificationSchema),
  wrap(async (req, res) => {
    const { email } = req.valid;

    const genericMessage =
      'If your account needs verification, a new OTP has been sent.';

    const user = await User.unscoped().findOne({
      where: {
        email,
        role: 'customer',
      },
    });

    // Avoid revealing whether an email has an account.
    if (!user || user.emailVerifiedAt) {
      return res.json({
        message: genericMessage,
      });
    }

    // Invalidate previous OTP and create a new one.
    const otp = await issueEmailOtp(user.id);

    try {
      await sendMail({
        to: user.email,
        subject: 'Your new Multivendor verification OTP',

        text:
          `Your new verification OTP is ${otp}.\n\n` +
          'This OTP expires in 10 minutes.',

        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
            <h2>Email verification</h2>

            <p>Your new verification OTP is:</p>

            <h1 style="letter-spacing:8px;color:#4f46e5">
              ${otp}
            </h1>

            <p>This OTP expires in 10 minutes.</p>

            <p>Please do not share this OTP with anyone.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error(
        '[mail] Resend OTP failed:',
        error.message
      );

      throw new AppError(
        503,
        'Unable to send the verification email right now. Please try again later.'
      );
    }

    return res.json({
      message: genericMessage,
    });
  })
);


// --------------------------------------------------
// FORGOT PASSWORD
// --------------------------------------------------

const forgotSchema = z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .email()
    .max(190),
});

router.post(
  '/forgot-password',
  limiter(10),
  validate(forgotSchema),
  wrap(async (req, res) => {
    const generic = {
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    const user = await User.findOne({
      where: {
        email: req.valid.email,
      },
    });

    if (user && user.status !== 'disabled') {
      try {
        const raw = await issueToken(
          user.id,
          'password_reset',
          RESET_TTL
        );

        const link = resetLink(raw);

        await sendMail({
          to: user.email,
          subject: 'Reset your password',

          text:
            'Use this link to choose a new password. ' +
            'It expires in 1 hour and works once.\n\n' +
            `${link}\n`,

          html: `
            <p>
              Use the link below to choose a new password.
              It expires in 1 hour and works once.
            </p>

            <p>
              <a href="${link}">Reset password</a>
            </p>
          `,
        });
      } catch (error) {
        console.error(
          `[mail] Reset email failed: ${error.message}`
        );
      }
    }

    return res.json(generic);
  })
);


// --------------------------------------------------
// RESET PASSWORD VALIDATION
// --------------------------------------------------

const resetSchema = z.object({
  token: z.string().min(32).max(200),
  password,
});


// --------------------------------------------------
// RESET PASSWORD
// Also handles first-time account setup.
// --------------------------------------------------

router.post(
  '/reset-password',
  limiter(10),
  validate(resetSchema),
  wrap(async (req, res) => {
    const {
      token: raw,
      password: newPassword,
    } = req.valid;

    const hash = await bcrypt.hash(
      newPassword,
      env.bcryptRounds
    );

    await sequelize.transaction(async (t) => {
      const token = await findValidToken(raw, t);

      if (!token) {
        throw new AppError(
          400,
          'This link is invalid or has expired. Please request a new one.'
        );
      }

      const user = await User.unscoped().findByPk(
        token.userId,
        {
          transaction: t,
          lock: t.LOCK.UPDATE,
        }
      );

      if (!user || user.status === 'disabled') {
        throw new AppError(
          400,
          'This link is invalid or has expired.'
        );
      }

      await user.update(
        {
          passwordHash: hash,
          status: 'active',
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
        {
          transaction: t,
        }
      );

      // Invalidate all outstanding tokens for this user.
      await AuthToken.update(
        {
          usedAt: new Date(),
        },
        {
          where: {
            userId: user.id,
            usedAt: null,
          },
          transaction: t,
        }
      );

      await audit(
        {
          actorId: user.id,
          action:
            token.type === 'account_setup'
              ? 'auth.account_setup'
              : 'auth.password_reset',
          entityType: 'user',
          entityId: user.id,
          ip: req.ip,
        },
        t
      );
    });

    return res.json({
      message: 'Password updated. You can now sign in.',
    });
  })
);


// --------------------------------------------------
// EXPORT ROUTER
// --------------------------------------------------

module.exports = router;
