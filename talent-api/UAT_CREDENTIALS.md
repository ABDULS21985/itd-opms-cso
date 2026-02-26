# Talent Portal - UAT Test Accounts

> **API Base URL:** `http://localhost:4002/api/v1`
> **Frontend URL:** `http://localhost:3003`
> **Note:** These accounts are seeded automatically by the `SeedUATData` migration.
> **Password for all accounts:** `Password123!`

---

## Quick Login Reference

| Role | Email | Password | Login Tab |
|------|-------|----------|-----------|
| Super Admin / Digibit | `superadmin@talentportal.uat` | `Password123!` | Employer |
| Placement Manager | `placement.manager@talentportal.uat` | `Password123!` | *API only* |
| Placement Officer | `placement.officer@talentportal.uat` | `Password123!` | *API only* |
| Candidate (Senior) | `ada.okafor@talentportal.uat` | `Password123!` | Candidate |
| Candidate (Mid) | `tunde.bakare@talentportal.uat` | `Password123!` | Candidate |
| Candidate (Junior) | `fatima.sule@talentportal.uat` | `Password123!` | Candidate |
| Employer (Paystack) | `hr@paystack.uat` | `Password123!` | Employer |
| Employer (Flutterwave) | `talent@flutterwave.uat` | `Password123!` | Employer |
| Employer (Digibit) | `superadmin@talentportal.uat` | `Password123!` | Employer |

---

## Admin Accounts

### Super Admin / Digibit Limited
| Field | Value |
|-------|-------|
| **Email** | `superadmin@talentportal.uat` |
| **Password** | `Password123!` |
| **Roles** | `super_admin`, `placement_manager`, `employer_admin` |
| **Employer Org** | Digibit Limited (verified, owner) |
| **Job Posted** | Full Stack Developer (published) |

### Placement Manager
| Field | Value |
|-------|-------|
| **Email** | `placement.manager@talentportal.uat` |
| **Password** | `Password123!` |
| **Roles** | `placement_manager` |

### Placement Officer
| Field | Value |
|-------|-------|
| **Email** | `placement.officer@talentportal.uat` |
| **Password** | `Password123!` |
| **Roles** | `placement_officer` |

---

## Candidate Accounts

### Ada Okafor (Senior, Approved)
| Field | Value |
|-------|-------|
| **Email** | `ada.okafor@talentportal.uat` |
| **Password** | `Password123!` |
| **Roles** | `candidate` |
| **Profile Status** | Approved, 95% strength, public visibility |
| **Track** | Software Engineering |
| **Experience** | 5 years |

### Tunde Bakare (Mid-level, Approved)
| Field | Value |
|-------|-------|
| **Email** | `tunde.bakare@talentportal.uat` |
| **Password** | `Password123!` |
| **Roles** | `candidate` |
| **Profile Status** | Approved, 80% strength, public visibility |
| **Track** | Software Engineering |
| **Experience** | 2 years |

### Fatima Sule (Junior, Pending Review)
| Field | Value |
|-------|-------|
| **Email** | `fatima.sule@talentportal.uat` |
| **Password** | `Password123!` |
| **Roles** | `candidate` |
| **Profile Status** | Submitted (pending review), 80% strength, private visibility |
| **Track** | Data Science |
| **Experience** | 1 year |

---

## Employer Accounts

### Paystack (Amaka Nwosu)
| Field | Value |
|-------|-------|
| **Email** | `hr@paystack.uat` |
| **Password** | `Password123!` |
| **Roles** | `employer_admin` |
| **Company** | Paystack (verified) |
| **Job Posted** | Backend Engineer - Payments (published) |
| **Intro Request** | Pending intro for Ada Okafor |

### Flutterwave (Chidi Eze)
| Field | Value |
|-------|-------|
| **Email** | `talent@flutterwave.uat` |
| **Password** | `Password123!` |
| **Roles** | `employer_admin` |
| **Company** | Flutterwave (verified) |
| **Job Posted** | Frontend Engineer - Dashboard (published) |

### Digibit Limited (Super Admin)
| Field | Value |
|-------|-------|
| **Email** | `superadmin@talentportal.uat` |
| **Password** | `Password123!` |
| **Roles** | `super_admin`, `placement_manager`, `employer_admin` |
| **Company** | Digibit Limited (verified) |
| **Website** | https://globaldigibit.com |
| **Sector** | Information Technology & Consulting |
| **HQ** | Abuja, Nigeria |
| **Contact Email** | connect@globaldigibit.com |
| **Job Posted** | Full Stack Developer (published) |

---

## API Authentication

### Login via API
```bash
curl -X POST http://localhost:4002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada.okafor@talentportal.uat","password":"Password123!","userType":"candidate"}'
```

Response:
```json
{"status":"success","data":{"token":"eyJhbG..."}}
```

### Register via API
```bash
curl -X POST http://localhost:4002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"MyPassword8!","userType":"candidate","fullName":"New User"}'
```

### Using the Token
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:4002/api/v1/me/profile
```

---

## Seeding on UAT Server

```bash
npm run migration:run
```
This executes both `InitialSchema` (creates tables) and `SeedUATData` (seeds all test data with password hashes).

To remove seed data:
```bash
npm run migration:revert
```
