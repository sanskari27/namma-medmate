# Dispensary UI contract

Pharmacy-floor app for OWNER and staff (pharmacist, cashier, inventory,
accountant). Not a generic SaaS dashboard and not the admin console.

## Voice and chrome

- Copy: operational and local — sign in, branch, counter, stock, patient,
  bill. Avoid “platform”, “tenant admin”, “HQ”, “master”.
- Visual: light surfaces, high-density forms and tables, emerald/operational
  accent already used in scaffold login. Keep contrast for a bright shop floor.
- Layout: branch context visible once the story introduces it. Prefer speed
  over marketing chrome. Dense lists beat card grids for daily work.

## Uniqueness

- Implement screens in `dispensary/` only. Do not paste admin pages or reuse
  admin class names, dark tokens, or HQ copy.
- Personas are pharmacy staff. MASTER-only flows do not belong here unless
  the story lists dispensary for a staff-facing part of that flow.

## States

Every story screen still needs loading, empty, validation, denied, conflict,
failure, and success with chemist-facing messages (what to do next at the
counter), not platform-operator jargon.
