# MediQ Deployment Guide

This guide explains how to deploy the MediQ Smart Queue Management System to a traditional Python hosting platform (Render, Railway, Fly.io, etc.) - **Option 2** from your choices.

## Prerequisites

1. **GitHub Repository**: Your code is already on GitHub at `https://github.com/Roger7-ux/Ste-MP.git`
2. **Hosting Account**: You'll need an account on a Python-friendly hosting platform
3. **Environment Variables**: You'll need to set several configuration variables

## Platform Options

This guide uses **Render.com** as an example, but the steps are similar for:
- [Railway.app](https://railway.app/)
- [Fly.io](https://fly.io/)
- [PythonAnywhere](https://pythonanywhere.com/)
- [Heroku](https://heroku.com) (though free tier is discontinued)

## Deployment Steps

### 1. Prepare Your Repository

The MediQ project is already deployment-ready:
- ✅ Contains `Procfile` for Waitress server
- ✅ Contains `requirements.txt` for dependencies
- ✅ Supports external `DATABASE_URL` environment variable
- ✅ Serves built React frontend from `client/dist`

### 2. Choose Your Database Approach

You have two options for data storage:

#### Option A: Use External Database (Recommended for Production)
Set up a PostgreSQL or MySQL database and use the `DATABASE_URL` environment variable.

#### Option B: Use Persistent Disk with SQLite
Use the hosting platform's persistent storage for the SQLite database file.

### 3. Required Environment Variables

Set these in your hosting platform's environment variables:

| Variable | Description | Example/Notes |
|----------|-------------|---------------|
| `CLINIC_CODE` | Clinic code for staff/doctor sign-up (**CHANGE FROM DEFAULT**) | `myclinic2026` |
| `SECRET_KEY` | Random secret for session security | Generate 32+ hex chars: `openssl rand -hex 32` |
| `HTTPS` | Set to `1` when served over HTTPS | `1` |
| `TRUST_PROXY` | Set to `1` when behind a proxy/load balancer | `1` |
| `PORT` | Port to listen on (usually auto-set) | `10000` (Render default) |

#### For External Database (Option A):
Add this variable:
| `DATABASE_URL` | External database URL | `postgres://user:pass@host:port/dbname` |

#### For Persistent Disk SQLite (Option B):
1. Add persistent disk/storage to your service
2. Set this variable:
| `CLINIC_DATA_DIR` | Path to persistent storage | `/var/lib/data` (Render) or `/data` (Railway) |

### 4. Platform-Specific Instructions

#### Render.com
1. Create a new Web Service
2. Connect your GitHub repository (`Roger7-ux/Ste-MP`)
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `waitress-serve --host=0.0.0.0 --port=$PORT wsgi:app`
5. Add environment variables as described above
6. (Optional) Add persistent disk for `CLINIC_DATA_DIR`
7. Click "Create Web Service"

#### Railway.app
1. Create a new Project from GitHub
2. Select your `Ste-MP` repository
3. Railway should auto-detect it's a Python project
4. Add environment variables in the Variables tab
5. (Optional) Add Volume for persistent storage
6. Deploy!

#### Fly.io
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Launch app: `fly launch` (from project directory)
3. Choose app name, region, etc.
4. Set secrets: `fly secrets set CLINIC_CODE=... SECRET_KEY=...`
5. Deploy: `fly deploy`

### 5. First-Time Setup

After deployment:
1. Visit your deployed URL
2. **Staff** create an account at `/staff/register` using your `CLINIC_CODE`
3. Staff add doctors and their time slots under **Doctors** → **Availability**
4. **Doctors** create accounts at `/staff/register`, choose "Doctor" role
5. **Patients** can now create accounts and book appointments

### 6. Important Notes

#### Database Considerations
- SQLite (default): Single file, good for low-medium usage
- External PostgreSQL/MySQL: Better for scaling, multiple instances, backups
- If using SQLite with persistent disk: Ensure backups are enabled

#### Clinic Code Security
- **Change `CLINIC_CODE` from the default `CLINIC-2026`**
- Anyone who knows this code can create staff/doctor accounts
- Set it before sharing the system publicly

#### Session Secret
- `SECRET_KEY` must be consistent across restarts to keep users logged in
- If you change it, all existing sessions will be invalidated

#### Updates
- Connect your GitHub repo for auto-deploys on push
- Or manually trigger redeploys when needed

### 7. Troubleshooting

#### "Application Error" on Startup
- Check logs for missing environment variables
- Ensure `SECRET_KEY` is set
- Verify database connectivity if using `DATABASE_URL`

#### Frontend Not Loading
- Check that `client/dist` exists and contains `index.html`
- The Flask app serves frontend from this directory

#### Database Connection Issues
- Verify `DATABASE_URL` format is correct
- Ensure database allows connections from your hosting provider's IP
- Test connection manually if possible

### 8. Backup Strategy

#### For SQLite with Persistent Disk
- Enable snapshots/backups in your hosting platform's dashboard
- Or periodically copy the `data/clinic.db` file

#### For External Database
- Use your database provider's backup features
- Or set up regular dump/restore procedures

## Verification

After deployment, verify these endpoints work:
- `GET /` - Should show the MediQ landing page
- `GET /api/auth/csrf` - Should return CSRF token
- `GET /doctors` - Should list doctors (empty until added)
- `GET /staff/register` - Should show staff registration form

## Support

If you encounter issues:
1. Check the platform's deployment logs
2. Verify all required environment variables are set
3. Ensure your database is accessible (if using external DB)
4. The application logs errors to stdout/stderr which platforms capture

---

**Ready to deploy?** Follow the steps above for your chosen platform, and your MediQ instance will be live and functional!