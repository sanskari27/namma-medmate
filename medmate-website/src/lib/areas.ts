// Bengaluru areas for the location pages and the footer. Pincodes are checked against India Post data
// (src/lib/pincodes.json, built by scripts/build-pincodes.py). Area list follows the founder's partner site.
import pincodes from "./pincodes.json";
import { slugify } from "./catalogue";

export const PINCODES = pincodes as Record<string, string[]>;

type Raw = [name: string, pins: string[]];
const ZONES_RAW: [zone: string, areas: Raw[]][] = [
  ["South Bengaluru", [
    ["Koramangala", ["560034", "560095"]], ["HSR Layout", ["560102"]], ["BTM Layout", ["560029", "560076"]], ["Jayanagar", ["560011", "560041", "560069", "560070"]],
    ["JP Nagar", ["560078", "560076"]], ["Banashankari", ["560050", "560070", "560085"]], ["Basavanagudi", ["560004"]], ["Kanakapura Road", ["560062", "560109"]],
    ["Bannerghatta Road", ["560076", "560083"]], ["Uttarahalli", ["560061"]], ["Padmanabhanagar", ["560070"]], ["Hulimavu", ["560076"]],
    ["Bommanahalli", ["560068"]], ["Madiwala", ["560068"]], ["Kudlu Gate", ["560068"]], ["Adugodi", ["560030"]], ["Kumaraswamy Layout", ["560078"]], ["Electronic City", ["560100"]],
  ]],
  ["East Bengaluru", [
    ["Indiranagar", ["560038", "560008"]], ["Whitefield", ["560066"]], ["Marathahalli", ["560037"]], ["Bellandur", ["560103"]], ["Domlur", ["560071"]],
    ["CV Raman Nagar", ["560093"]], ["Sarjapur Road", ["560035", "560103"]], ["Brookefield", ["560037"]], ["Hoodi", ["560048"]], ["KR Puram", ["560036"]],
    ["Mahadevapura", ["560048"]], ["Kadugodi", ["560067"]], ["Varthur", ["560087"]], ["Doddanekundi", ["560037"]], ["Ramamurthy Nagar", ["560016"]], ["HAL", ["560017"]],
  ]],
  ["North Bengaluru", [
    ["Hebbal", ["560024"]], ["Yelahanka", ["560064"]], ["RT Nagar", ["560032"]], ["Sahakara Nagar", ["560092"]], ["Vidyaranyapura", ["560097"]],
    ["Jakkur", ["560064"]], ["Thanisandra", ["560077"]], ["Nagawara", ["560045"]], ["Hennur", ["560043"]], ["Kalyan Nagar", ["560043"]],
    ["Kammanahalli", ["560084"]], ["Banaswadi", ["560043"]], ["Horamavu", ["560043"]], ["HBR Layout", ["560043"]], ["Jalahalli", ["560013", "560014", "560015"]],
    ["Yeshwanthpur", ["560022"]], ["Mathikere", ["560054"]], ["Sanjay Nagar", ["560094"]], ["Peenya", ["560058"]],
  ]],
  ["West Bengaluru", [
    ["Rajajinagar", ["560010"]], ["Malleshwaram", ["560003", "560055"]], ["Vijayanagar", ["560040"]], ["Basaveshwaranagar", ["560079"]], ["Nagarbhavi", ["560072"]],
    ["Rajarajeshwari Nagar", ["560098"]], ["Kengeri", ["560060"]], ["Nandini Layout", ["560096"]], ["Mahalakshmi Layout", ["560086"]], ["Magadi Road", ["560023"]],
    ["Chandra Layout", ["560040"]], ["Attiguppe", ["560040"]], ["Girinagar", ["560085"]],
  ]],
  ["Central Bengaluru", [
    ["MG Road", ["560001"]], ["Frazer Town", ["560005"]], ["Brigade Road", ["560001", "560025"]], ["Ulsoor", ["560008"]], ["Shivajinagar", ["560051"]],
    ["Cox Town", ["560005"]], ["Richmond Town", ["560025"]], ["Cunningham Road", ["560052"]], ["Vasanth Nagar", ["560052"]], ["Sadashivanagar", ["560080"]],
    ["Seshadripuram", ["560020"]], ["Wilson Garden", ["560027"]], ["Shanti Nagar", ["560027"]], ["Chickpet", ["560053"]], ["Chamarajpet", ["560018"]], ["Benson Town", ["560046"]],
  ]],
  ["Greater Bengaluru", [
    ["Sarjapur", ["562125"]], ["Devanahalli", ["562110"]], ["Hoskote", ["562114"]], ["Anekal", ["562106"]], ["Chandapura", ["560081", "560099"]],
    ["Attibele", ["562107"]], ["Jigani", ["560105"]], ["Nelamangala", ["562123"]], ["Bidadi", ["562109"]], ["Doddaballapur", ["561203"]],
  ]],
];

export type Area = { name: string; slug: string; zone: string; pins: string[] };
export const ZONES = ZONES_RAW.map(([zone, areas]) => ({
  zone,
  slug: slugify(zone),
  areas: areas.map(([name, pins]): Area => ({ name, slug: slugify(name), zone, pins: pins.filter((p) => PINCODES[p]) })),
}));
export const AREAS: Area[] = ZONES.flatMap((z) => z.areas);
export const areaBySlug = (slug: string) => AREAS.find((a) => a.slug === slug);
export const nearby = (a: Area, n = 8) => AREAS.filter((x) => x.zone === a.zone && x.slug !== a.slug).slice(0, n);
/** Post office localities for an area's pincodes (official India Post names). */
export const localities = (a: Area) => [...new Set(a.pins.flatMap((p) => PINCODES[p] ?? []))];
/** Areas that share a pincode, for the pincode table. */
export const areasForPin = (pin: string) => AREAS.filter((a) => a.pins.includes(pin));
/** Most-searched areas, shown first on Home and medicine pages. */
export const POPULAR_AREAS = ["koramangala", "hsr-layout", "indiranagar", "whitefield", "jayanagar", "btm-layout", "jp-nagar", "electronic-city", "marathahalli", "bellandur", "hebbal", "yelahanka", "malleshwaram", "rajajinagar", "banashankari", "kr-puram", "sarjapur-road", "basavanagudi"]
  .map((s) => AREAS.find((a) => a.slug === s)!)
  .filter(Boolean);
