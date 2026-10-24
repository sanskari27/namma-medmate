// Line-style icons (stroke=currentColor) used across the dashboard.
type P = { size?: number };
const S = ({ size = 20, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const IconDashboard = (p: P) => (<S {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>);
export const IconPos = (p: P) => (<S {...p}><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18" /><path d="M7 14h4" /><path d="M16 14h1" /></S>);
export const IconOrders = (p: P) => (<S {...p}><path d="M6 2 4 6v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4Z" /><path d="M4 6h16" /><path d="M9 10a3 3 0 0 0 6 0" /></S>);
export const IconInventory = (p: P) => (<S {...p}><path d="M3 7 12 3l9 4-9 4Z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></S>);
export const IconRx = (p: P) => (<S {...p}><path d="M5 21V4a1 1 0 0 1 1-1h7l5 5v3" /><path d="M13 3v6h6" /><path d="M7 13h4a2 2 0 0 1 0 4H7v-4Zm0 4 5 4" /></S>);
export const IconStore = (p: P) => (<S {...p}><path d="M3 9 4.5 4h15L21 9" /><path d="M3 9a2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0" /><path d="M5 11v9h14v-9" /><path d="M9 20v-5h6v5" /></S>);
export const IconOffer = (p: P) => (<S {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.6a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6Z" /><circle cx="7.5" cy="7.5" r="1.3" /></S>);
export const IconReports = (p: P) => (<S {...p}><path d="M3 3v18h18" /><path d="M7 15l3-4 3 2 5-7" /></S>);
export const IconSettings = (p: P) => (<S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.4H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.6V4a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8" /></S>);

export const IconSearch = (p: P) => (<S {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>);
export const IconBell = (p: P) => (<S {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" /></S>);
export const IconPlus = (p: P) => (<S {...p}><path d="M12 5v14M5 12h14" /></S>);
export const IconPrint = (p: P) => (<S {...p}><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" /></S>);
export const IconCheck = (p: P) => (<S {...p}><path d="M20 6 9 17l-5-5" /></S>);
export const IconX = (p: P) => (<S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>);
export const IconEdit = (p: P) => (<S {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></S>);
export const IconTrash = (p: P) => (<S {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" /></S>);
export const IconArrowRight = (p: P) => (<S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>);
export const IconUpload = (p: P) => (<S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 9l5-5 5 5M12 4v12" /></S>);
export const IconAlert = (p: P) => (<S {...p}><path d="M10.3 3.5 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></S>);
export const IconClock = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>);
export const IconRupee = (p: P) => (<S {...p}><path d="M6 4h12M6 8h12M6 12h6a4 4 0 0 1 0 8H6l8-8" /></S>);
export const IconUser = (p: P) => (<S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>);
export const IconTruck = (p: P) => (<S {...p}><path d="M3 6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v9H3Z" /><path d="M15 8h3.5a1 1 0 0 1 .8.4L22 12v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></S>);
export const IconUsers = (p: P) => (<S {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /><path d="M17.5 20a6 6 0 0 0-3-5.2" /></S>);
export const IconCustomers = (p: P) => (<S {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2.2" /><path d="M5.5 16a3.5 3.5 0 0 1 7 0" /><path d="M15 9h4M15 13h4" /></S>);
export const IconSend = (p: P) => (<S {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></S>);
export const IconKiosk = (p: P) => (<S {...p}><rect x="4" y="3" width="16" height="13" rx="2" /><path d="M9 20h6M12 16v4" /><path d="M8 7h8M8 10h5" /></S>);
export const IconShare = (p: P) => (<S {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" /></S>);
export const IconReceipt = (p: P) => (<S {...p}><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21Z" /><path d="M8 8h8M8 12h8M8 16h5" /></S>);
export const IconCrown = (p: P) => (<S {...p}><path d="M3 7l4 4 5-7 5 7 4-4-2 12H5Z" /><path d="M5 20h14" /></S>);
export const IconGift = (p: P) => (<S {...p}><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v8h14v-8M12 8v13" /><path d="M12 8C12 5 10 3 8 4s-1 4 4 4Zm0 0c0-3 2-5 4-4s1 4-4 4Z" /></S>);
export const IconHelp = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M9.2 9a3 3 0 0 1 5.6 1c0 2-3 2.5-3 4M12 17h.01" /></S>);
export const IconMail = (p: P) => (<S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></S>);
export const IconMessage = (p: P) => (<S {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" /><path d="M8 10h8M8 13h5" /></S>);
export const IconWhatsApp = (p: P) => (<S {...p}><path d="M3 21l1.7-4.1A8 8 0 1 1 7.9 19L3 21Z" /><path d="M8.6 8.4c-.2 1.6.6 3.2 1.9 4.4 1.2 1.2 2.8 2 4.4 1.9.5 0 .9-.5.9-1l-.2-1.1a.7.7 0 0 0-.5-.5l-1.3-.3c-.3 0-.5.1-.7.3l-.3.3c-.9-.4-1.6-1.1-2-2l.3-.3c.2-.2.3-.5.2-.7l-.3-1.3a.7.7 0 0 0-.5-.5l-1.1-.2c-.5 0-1 .4-1 .9Z" /></S>);
export const IconLink = (p: P) => (<S {...p}><path d="M10 13a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 1 0-5.7-5.7L11 6.3" /><path d="M14 11a4 4 0 0 0-5.7 0L6 13.3a4 4 0 1 0 5.7 5.7L13 17.7" /></S>);
export const IconCash = (p: P) => (<S {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9v6M18 9v6" /></S>);

// ── extended set (added for the emoji → vector sweep) ──
export const IconBox = (p: P) => (<S {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5Z" /><path d="m3 8 9 5 9-5M12 13v8" /></S>);
export const IconPin = (p: P) => (<S {...p}><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2.2" /></S>);
export const IconDownload = (p: P) => (<S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 11l5 5 5-5M12 16V4" /></S>);
export const IconLock = (p: P) => (<S {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 15v2" /></S>);
export const IconUnlock = (p: P) => (<S {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /><path d="M12 15v2" /></S>);
export const IconGlobe = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></S>);
export const IconPill = (p: P) => (<S {...p}><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" /><path d="M8.5 8.5 15.5 15.5" /></S>);
export const IconCamera = (p: P) => (<S {...p}><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></S>);
export const IconDoc = (p: P) => (<S {...p}><path d="M6 2h8l4 4v16H6Z" /><path d="M14 2v4h4" /><path d="M9 12h6M9 16h6" /></S>);
export const IconStar = (p: P) => (<S {...p}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9Z" /></S>);
export const IconMap = (p: P) => (<S {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z" /><path d="M9 4v14M15 6v14" /></S>);
export const IconFolder = (p: P) => (<S {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></S>);
export const IconWallet = (p: P) => (<S {...p}><path d="M3 7a2 2 0 0 1 2-2h12v3" /><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></S>);
export const IconHospital = (p: P) => (<S {...p}><path d="M4 21V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v15" /><path d="M2 21h20" /><path d="M12 8v5M9.5 10.5h5" /><path d="M9 21v-3h6v3" /></S>);
export const IconSparkle = (p: P) => (<S {...p}><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /><path d="m6.5 6.5 3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" /></S>);
export const IconMedical = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></S>);
export const IconShield = (p: P) => (<S {...p}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z" /><path d="m9 12 2 2 4-4" /></S>);
export const IconTag = (p: P) => (<S {...p}><path d="M3 3h8l10 10-8 8L3 11Z" /><circle cx="7.5" cy="7.5" r="1.3" /></S>);
export const IconStethoscope = (p: P) => (<S {...p}><path d="M5 3v5a4 4 0 0 0 8 0V3" /><path d="M5 3H3M13 3h2" /><path d="M9 12v3a5 5 0 0 0 10 0v-2" /><circle cx="19" cy="11" r="2" /></S>);
export const IconBed = (p: P) => (<S {...p}><path d="M3 8v12M3 12h18a0 0 0 0 1 0 0v8" /><path d="M3 16h18" /><path d="M7 12v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" /></S>);
export const IconChart = (p: P) => (<S {...p}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></S>);
export const IconTrendUp = (p: P) => (<S {...p}><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></S>);
export const IconTrendDown = (p: P) => (<S {...p}><path d="M3 7 9 13l4-4 8 8" /><path d="M15 17h6v-6" /></S>);
export const IconCard = (p: P) => (<S {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></S>);
export const IconBulb = (p: P) => (<S {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></S>);
export const IconCalc = (p: P) => (<S {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8" /><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h4" /></S>);
export const IconCart = (p: P) => (<S {...p}><path d="M2 3h2l2.5 12.5a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L20 7H5" /><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></S>);
export const IconIdCard = (p: P) => (<S {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="11" r="2.2" /><path d="M4.5 16a3.5 3.5 0 0 1 7 0" /><path d="M15 10h4M15 14h4" /></S>);
export const IconKey = (p: P) => (<S {...p}><circle cx="8" cy="8" r="4" /><path d="m11 11 8 8M16 16l2-2M19 19l1.5-1.5" /></S>);
export const IconRefresh = (p: P) => (<S {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v5h-5" /></S>);
export const IconCopy = (p: P) => (<S {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></S>);
export const IconChevronLeft = (p: P) => (<S {...p}><path d="M15 18l-6-6 6-6" /></S>);
export const IconEye = (p: P) => (<S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></S>);
export const IconEyeOff = (p: P) => (<S {...p}><path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.2 6.2A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3.9-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></S>);
export const IconMega = (p: P) => (<S {...p}><path d="M3 11v2a1 1 0 0 0 1 1h2l8 5V5L6 10H4a1 1 0 0 0-1 1Z" /><path d="M18 9a3 3 0 0 1 0 6" /></S>);
export const IconPhone = (p: P) => (<S {...p}><path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L17 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" /></S>);
export const IconTicket = (p: P) => (<S {...p}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M14 6v12" /></S>);
export const IconCalendar = (p: P) => (<S {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></S>);
export const IconHash = (p: P) => (<S {...p}><path d="M9 3 7 21M17 3l-2 18M4 8h16M3 16h16" /></S>);
export const IconInbox = (p: P) => (<S {...p}><path d="M3 13h5l1.5 3h5L21 13" /><path d="M3 13 5 5h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></S>);
export const IconBriefcase = (p: P) => (<S {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></S>);
export const IconScale = (p: P) => (<S {...p}><path d="M12 3v18M6 21h12" /><path d="M12 6 4 8l3 6a3 3 0 0 1-6 0l3-6M12 6l8 2-3 6a3 3 0 0 0 6 0l-3-6" /></S>);
export const IconImage = (p: P) => (<S {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></S>);
export const IconMonitor = (p: P) => (<S {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></S>);
export const IconBank = (p: P) => (<S {...p}><path d="M3 9 12 4l9 5" /><path d="M4 9v9M9 9v9M15 9v9M20 9v9M3 21h18" /></S>);
export const IconBolt = (p: P) => (<S {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></S>);
export const IconHeart = (p: P) => (<S {...p}><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z" /></S>);
export const IconDot = ({ size = 10 }: P) => (<svg width={size} height={size} viewBox="0 0 10 10" aria-hidden><circle cx="5" cy="5" r="5" fill="currentColor" /></svg>);
export const IconDonut = (p: P) => (<S {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M12 3.5V8.5" /></S>);
export const IconBars = (p: P) => (<S {...p}><rect x="4" y="10" width="4" height="10" /><rect x="10" y="5" width="4" height="15" /><rect x="16" y="13" width="4" height="7" /></S>);
