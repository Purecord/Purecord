/*
 * Equicord, a Discord client mod
 * Based on CustomProfile from Nightcord (GPL-3.0-or-later)
 * Adapted: removed server sync / OAuth — local storage only
 */

import "./styles.css";

import { ProfileBadge } from "@api/Badges";
import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { DataStore } from "@api/index";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { AuthenticationStore, Button, FluxDispatcher, GuildMemberStore, IconUtils, Menu, React, Select, SettingsRouter, SnowflakeUtils, UserProfileStore, UserStore } from "@webpack/common";
import virtualMerge from "virtual-merge";

// ─── No server imports needed — everything is local ───────────────────────────

const DS_KEY = "customProfile_data";
const DS_ENABLED = "customProfile_enabled";
const DS_ALL_DATA = "customProfile_allData";
const DS_ALL_ENABLED = "customProfile_allEnabled";
const LS_KEY_DATA = "CP_data";
const LS_KEY_ENABLED = "CP_enabled";
const LS_ALL_DATA = "CP_allData";
const LS_ALL_ENABLED = "CP_allEnabled";

const FLAG = {
    STAFF: 1,
    PARTNER: 2,
    HYPESQUAD: 4,
    BUG_HUNTER_1: 8,
    BRAVERY: 64,
    BRILLIANCE: 128,
    BALANCE: 256,
    EARLY_SUPPORTER: 512,
    BUG_HUNTER_2: 16384,
    DEV_VERIFIED: 131072,
    MOD_ALUMNI: 262144,
    ACTIVE_DEVELOPER: 4194304,
};

const BADGES = [
    { label: "Staff Discord", flag: FLAG.STAFF, icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png" },
    { label: "Partner", flag: FLAG.PARTNER, icon: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png" },
    { label: "HypeSquad Events", flag: FLAG.HYPESQUAD, icon: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png" },
    { label: "Bug Hunter Lvl 1", flag: FLAG.BUG_HUNTER_1, icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png" },
    { label: "HypeSquad Bravery", flag: FLAG.BRAVERY, icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png" },
    { label: "HypeSquad Brilliance", flag: FLAG.BRILLIANCE, icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png" },
    { label: "HypeSquad Balance", flag: FLAG.BALANCE, icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png" },
    { label: "Early Supporter", flag: FLAG.EARLY_SUPPORTER, icon: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png" },
    { label: "Former Moderator", flag: FLAG.MOD_ALUMNI, icon: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png" },
    { label: "Bug Hunter Lvl 2", flag: FLAG.BUG_HUNTER_2, icon: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png" },
    { label: "Verified Developer", flag: FLAG.DEV_VERIFIED, icon: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png" },
    { label: "Active Developer", flag: FLAG.ACTIVE_DEVELOPER, icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png" },
];

const OLD_NAME_BADGE_ICON = "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png";

const NITRO_LEVELS = [
    { label: "Nitro (0 months)", icon: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png" },
    { label: "Bronze (1 month)", icon: "https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png" },
    { label: "Silver (2 months)", icon: "https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png" },
    { label: "Gold (3 months)", icon: "https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png" },
    { label: "Platinum (6 months)", icon: "https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png" },
    { label: "Diamond (12 months)", icon: "https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png" },
    { label: "Emerald (24 months)", icon: "https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png" },
    { label: "Ruby (36 months)", icon: "https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png" },
    { label: "Opal (72 months)", icon: "https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png" },
];

const BOOST_LABELS = ["1 Month", "2 Months", "3 Months", "6 Months", "9 Months", "12 Months", "15 Months", "18 Months", "24 Months"];
const BOOST_ICONS = [
    "https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png",
    "https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png",
    "https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png",
    "https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png",
    "https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png",
    "https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png",
    "https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png",
    "https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png",
    "https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png",
];

const AVATAR_DECORATIONS = [
    { id: "1144307957425778779", label: "Hearts" },
    { id: "1144308196723408958", label: "Hearts Animated" },
    { id: "1212569433839636530", label: "Lofi Cafe" },
    { id: "1481387347642810480", label: "Winter" },
    { id: "1343751617362661526", label: "Magic Orb" },
    { id: "1373015260465987705", label: "Dragon" },
    { id: "1333866045303423026", label: "Ghost" },
    { id: "1144308439720394944", label: "Sakura Drift" },
    { id: "1432550258126229565", label: "Neon" },
    { id: "1462116613632426014", label: "Cyber City" },
    { id: "1462116613682757888", label: "Retro" },
    { id: "1144307629225672846", label: "Fire" },
    { id: "1341506443718688768", label: "Void" },
    { id: "1447654090640330763", label: "Celestial" },
    { id: "1483857762890022923", label: "Snowy" },
    { id: "1479561706672885811", label: "Ice" },
    { id: "1212569856189407352", label: "Cozy" },
    { id: "1485784028710830242", label: "New Year" },
    { id: "1341506444150702080", label: "Abyss" },
    { id: "1232071712695386162", label: "Spring" },
    { id: "1220514048068812901", label: "Summer" },
    { id: "1427463138634109026", label: "Autumn" },
    { id: "1341506443865489408", label: "Darkness" },
];

function getDecorationUrl(assetId: string, animated = false): string {
    return `https://cdn.discordapp.com/media/v1/collectibles-shop/${assetId}/${animated ? "animated" : "static"}`;
}

interface CustomProfileData {
    username?: string;
    globalName?: string;
    avatar?: string;
    banner?: string;
    bio?: string;
    accentColor?: number;
    accentColor2?: number;
    pronouns?: string;
    badgeFlags?: number;
    createdAt?: string;
    nitro?: boolean;
    nitroLevel?: number;
    boostMonths?: number;
    email?: string;
    phone?: string;
    customBadgeIds?: string[];
    oldName?: string;
    decorationAsset?: string;
    copiedUserId?: string;
}

let storedData: CustomProfileData = {};
let isEnabled = false;
let domObserver: MutationObserver | null = null;
let allAccountsData: Record<string, CustomProfileData> = {};
let allAccountsEnabled: Record<string, boolean> = {};

let cacheDatesR: string[] = [];
let cacheDatesF: string[] = [];
let leCacheU: string | null = null;
let leCacheI: string | null = null;

function choppeDatesReelles(): string[] {
    try {
        const u = UserStore.getCurrentUser();
        if (!u?.id) return [];
        if (leCacheU === u.id) return cacheDatesR;
        leCacheU = u.id;
        cacheDatesR = getRealDateVariants();
        return cacheDatesR;
    } catch { return []; }
}

function choppeDatesBidons(iso: string): string[] {
    if (leCacheI === iso) return cacheDatesF;
    leCacheI = iso;
    cacheDatesF = getFakeDateVariants(iso);
    return cacheDatesF;
}

let cachedOriginalUser: any = null;
let cachedFakeUser: any = null;
let cachedDataHash: number = 0;
let _trueOriginalUser: any = null;
let _dataVersion: number = 0;

function saveDataSync(data: CustomProfileData, enabled: boolean) {
    try {
        localStorage.setItem(LS_KEY_DATA, JSON.stringify(data));
        localStorage.setItem(LS_KEY_ENABLED, enabled ? "1" : "0");
    } catch { }
}

function saveAllDataSync() {
    try {
        localStorage.setItem(LS_ALL_DATA, JSON.stringify(allAccountsData));
        localStorage.setItem(LS_ALL_ENABLED, JSON.stringify(allAccountsEnabled));
    } catch { }
}

function syncCurrentUserData() {
    const myId = _cachedMyId || AuthenticationStore?.getId?.();
    if (myId) {
        _cachedMyId = myId;
        storedData = allAccountsData[myId] || {};
        isEnabled = allAccountsEnabled[myId] || false;
    }
}

function loadDataSync() {
    try {
        const rawAll = localStorage.getItem(LS_ALL_DATA);
        if (rawAll) {
            try { allAccountsData = JSON.parse(rawAll); } catch { allAccountsData = {}; }
            const rawEnabled = localStorage.getItem(LS_ALL_ENABLED);
            try { allAccountsEnabled = rawEnabled ? JSON.parse(rawEnabled) : {}; } catch { allAccountsEnabled = {}; }
            syncCurrentUserData();
            return;
        }
        const raw = localStorage.getItem(LS_KEY_DATA);
        const en = localStorage.getItem(LS_KEY_ENABLED);
        if (raw) {
            try { storedData = JSON.parse(raw); } catch { storedData = {}; }
        } else { storedData = {}; }
        isEnabled = en === "1";
    } catch {
        storedData = {};
        isEnabled = false;
    }
}

function onAccountSwitch() {
    updateCachedRealData();
    syncCurrentUserData();
    cachedFakeUser = null;
    cachedOriginalUser = null;
    _trueOriginalUser = null;
    leCacheU = null;
    leCacheI = null;
    cacheDatesR = [];
    cacheDatesF = [];
    _dataVersion++;
    _realUsername = "";
    _realGlobalName = "";
    if (isEnabled) startDomObserver();
    else stopDomObserver();
    forceAccountPanelRerender();
}

loadDataSync();

const HIDE_STYLE_ID = "cp-hide-during-load";
function injectHideStyle() {
    if (!isEnabled) return;
    if (document.getElementById(HIDE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = HIDE_STYLE_ID;
    style.textContent = `
        [class*='nameTag'] [class*='username'],
        [class*='nameTag'] [class*='discriminator'],
        [class*='nameTag'] [class*='panelSubtitle']
        { color: transparent !important; }
        [class*='accountProfilePopout'] [class*='avatarWrap'] img,
        [class*='accountProfilePopout'] [class*='avatarWrap'] svg
        { opacity: 0 !important; }
    `;
    const inject = () => {
        if (!document.head) { requestAnimationFrame(inject); return; }
        document.head.appendChild(style);
    };
    inject();
}
function removeHideStyle() {
    document.getElementById(HIDE_STYLE_ID)?.remove();
}
if (isEnabled) injectHideStyle();

let _avatarPatchApplied = false;
function applyAvatarPatchEarly() {
    if (_avatarPatchApplied) return;
    try {
        if (!IconUtils?.getUserAvatarURL) return;
        const orig = IconUtils.getUserAvatarURL;
        IconUtils.getUserAvatarURL = function (user: any, ...args: any[]) {
            if (!user) return orig(user, ...args);
            const uid = user.id ?? user.userId;
            if (!uid) return orig(user, ...args);
            if (isEnabled && storedData.avatar && isMe(uid)) {
                return storedData.avatar;
            }
            return orig(user, ...args);
        };
        _avatarPatchApplied = true;
    } catch { }
}

async function loadData() {
    try {
        const allData = await DataStore.get(DS_ALL_DATA) as Record<string, CustomProfileData> | null;
        const allEnabled = await DataStore.get(DS_ALL_ENABLED) as Record<string, boolean> | null;
        if (allData && typeof allData === "object" && Object.keys(allData).length > 0) {
            allAccountsData = allData;
            allAccountsEnabled = allEnabled || {};
            syncCurrentUserData();
            saveAllDataSync();
            saveDataSync(storedData, isEnabled);
            return;
        }
        const d = await DataStore.get(DS_KEY) as CustomProfileData | null;
        const e = await DataStore.get(DS_ENABLED) as boolean | null;
        if (d !== null) storedData = d;
        if (e !== null) isEnabled = e === true;
        const myId = AuthenticationStore?.getId?.();
        if (myId && storedData && Object.keys(storedData).length > 0) {
            allAccountsData[myId] = storedData;
            allAccountsEnabled[myId] = isEnabled;
            DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { });
            DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
            saveAllDataSync();
        }
        saveDataSync(storedData, isEnabled);
    } catch { }
}

async function copyUserProfile(userId: string) {
    try {
        const user = UserStore.getUser(userId) as any;
        if (!user) return;

        const { findByProps } = await import("@webpack") as any;
        const UserProfileStore = findByProps("getUserProfile", "getGuildMemberProfile") as any;
        const IU = IconUtils as any;
        const profile = UserProfileStore?.getUserProfile?.(userId) ?? {};

        const newData: CustomProfileData = {
            username: user.username || "",
            globalName: user.globalName || "",
            pronouns: "",
            bio: "",
            accentColor: undefined,
            accentColor2: undefined,
            banner: "",
            avatar: "",
            badgeFlags: 0,
            customBadgeIds: [],
            nitro: false,
            nitroLevel: -1,
            boostMonths: -1,
            decorationAsset: undefined,
            createdAt: undefined,
            copiedUserId: userId
        };

        if (user.bio !== undefined) newData.bio = user.bio || "";
        if (profile.bio !== undefined) newData.bio = profile.bio || "";

        try {
            const avatarUrl = IU?.getUserAvatarURL?.(user, false, 512)
                ?? (user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=512` : null);
            if (avatarUrl) newData.avatar = avatarUrl;
        } catch { }

        const hasNitro = (profile.premiumType ?? 0) > 0;
        newData.nitro = hasNitro;

        if (hasNitro) {
            const premiumSince = profile.premiumSince ?? user.premiumSince ?? null;
            if (premiumSince) {
                const months = Math.floor((Date.now() - new Date(premiumSince).getTime()) / (1000 * 60 * 60 * 24 * 30));
                if (months >= 72) newData.nitroLevel = 7;
                else if (months >= 36) newData.nitroLevel = 6;
                else if (months >= 24) newData.nitroLevel = 5;
                else if (months >= 12) newData.nitroLevel = 4;
                else if (months >= 6) newData.nitroLevel = 3;
                else if (months >= 3) newData.nitroLevel = 2;
                else if (months >= 2) newData.nitroLevel = 1;
                else newData.nitroLevel = 0;
            } else {
                newData.nitroLevel = 0;
            }
        }

        const boostSince = profile.premiumGuildSince ?? null;
        if (boostSince) {
            const bMonths = Math.floor((Date.now() - new Date(boostSince).getTime()) / (1000 * 60 * 60 * 24 * 30));
            if (bMonths >= 24) newData.boostMonths = 8;
            else if (bMonths >= 18) newData.boostMonths = 7;
            else if (bMonths >= 15) newData.boostMonths = 6;
            else if (bMonths >= 12) newData.boostMonths = 5;
            else if (bMonths >= 9) newData.boostMonths = 4;
            else if (bMonths >= 6) newData.boostMonths = 3;
            else if (bMonths >= 3) newData.boostMonths = 2;
            else if (bMonths >= 2) newData.boostMonths = 1;
            else newData.boostMonths = 0;
        }

        const bannerId = profile.banner ?? user.banner ?? null;
        if (bannerId) newData.banner = IconUtils.getUserBannerURL({ id: userId, banner: bannerId, size: 512 }) ?? "";

        if (profile.accentColor !== undefined) newData.accentColor = profile.accentColor;
        else if (user.accentColor !== undefined) newData.accentColor = user.accentColor;

        try {
            const ms = Number(BigInt(userId) >> 22n) + 1420070400000;
            newData.createdAt = new Date(ms).toISOString().slice(0, 10);
        } catch { }

        try {
            const flags = user.publicFlags ?? 0;
            let badgeFlags = 0;
            for (const { flag } of BADGES) { if (flags & flag) badgeFlags |= flag; }
            newData.badgeFlags = badgeFlags;
            if (user.avatarDecorationData?.asset) newData.decorationAsset = user.avatarDecorationData.asset;
        } catch { }

        newData.copiedUserId = userId;
        storedData = newData;
        isEnabled = true;
        cachedFakeUser = null;
        cachedOriginalUser = null;
        _trueOriginalUser = null;
        leCacheU = null;
        leCacheI = null;
        cacheDatesR = [];
        cacheDatesF = [];
        _dataVersion++;
        saveDataSync(newData, true);

        const myId = AuthenticationStore?.getId?.();
        if (myId) {
            allAccountsData[myId] = newData;
            allAccountsEnabled[myId] = true;
        }
        saveAllDataSync();
        DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { });
        DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });

        forceAccountPanelRerender();
    } catch (err) {
        console.error("[CustomProfile] copyUserProfile error:", err);
    }
}

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: any) => {
    if (!children || !Array.isArray(children) || !user || !user.id) return;
    try {
        const me = UserStore.getCurrentUser();
        if (!me || user.id === me.id) return;
        const isCopied = isEnabled && storedData.copiedUserId === user.id;

        children.push(
            <Menu.MenuGroup>
                {isCopied ? (
                    <Menu.MenuItem
                        id="remove-copy-profile"
                        label="Remove copy profile"
                        color="danger"
                        action={() => {
                            try {
                                const myId = AuthenticationStore?.getId?.();
                                if (myId) {
                                    delete allAccountsData[myId];
                                    delete allAccountsEnabled[myId];
                                }
                                storedData = {};
                                isEnabled = false;
                                saveDataSync({}, false);
                                cachedFakeUser = null;
                                cachedOriginalUser = null;
                                _trueOriginalUser = null;
                                leCacheU = null;
                                leCacheI = null;
                                cacheDatesR = [];
                                cacheDatesF = [];
                                _dataVersion++;
                                saveAllDataSync();
                                DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { });
                                DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
                                forceAccountPanelRerender();
                            } catch (e) {
                                console.error("[CustomProfile] Error removing copy:", e);
                            }
                        }}
                    />
                ) : (
                    <Menu.MenuItem
                        id="copy-user-profile"
                        label="Copy this profile"
                        action={() => copyUserProfile(user.id)}
                    />
                )}
            </Menu.MenuGroup>
        );
    } catch (err) {
        console.error("[CustomProfile] Context menu patch error:", err);
    }
};

function getRealDateVariants(): string[] {
    try {
        const u = UserStore.getCurrentUser();
        if (!u?.id) return [];
        const ms = Number(BigInt(u.id) >> 22n) + 1420070400000;
        const d = new Date(ms);
        const variants = new Set<string>();
        const locales = ["en-US", "en-GB", navigator.language];
        const fmtSpecs: Intl.DateTimeFormatOptions[] = [
            { day: "numeric", month: "short", year: "numeric" },
            { day: "numeric", month: "long", year: "numeric" },
            { month: "short", day: "numeric", year: "numeric" },
            { month: "long", day: "numeric", year: "numeric" },
            { day: "2-digit", month: "2-digit", year: "numeric" },
        ];
        for (const loc of locales) {
            for (const fmt of fmtSpecs) {
                try {
                    const s = new Intl.DateTimeFormat(loc, fmt).format(d);
                    variants.add(s);
                } catch { }
            }
        }
        variants.add(d.getFullYear().toString());
        return [...variants].filter(v => v.length >= 4);
    } catch { return []; }
}

function getFakeDateVariants(isoDate: string): string[] {
    try {
        const d = new Date(isoDate + "T12:00:00Z");
        const variants = new Set<string>();
        const fmtSpecs: Intl.DateTimeFormatOptions[] = [
            { day: "numeric", month: "short", year: "numeric" },
            { day: "numeric", month: "long", year: "numeric" },
            { month: "short", day: "numeric", year: "numeric" },
            { month: "long", day: "numeric", year: "numeric" },
        ];
        for (const fmt of fmtSpecs) {
            try { variants.add(new Intl.DateTimeFormat(navigator.language, fmt).format(d)); } catch { }
        }
        return [...variants];
    } catch { return []; }
}

let _cachedMyId: string | null = null;
let _realUsername = "";
let _realGlobalName = "";

function updateCachedRealData() {
    try { const myId = AuthenticationStore?.getId?.(); if (myId) _cachedMyId = myId; } catch { }
}

let _domQueued = false;
let _domMutations: MutationRecord[] = [];

function scanTextNode(node: Text) {
    if (!isEnabled || !node.nodeValue) return;
    const val = (node as any).__cp_orig || node.nodeValue;
    let result = val;
    try { if (_trueOriginalUser) { _realUsername = _trueOriginalUser.username || _realUsername; _realGlobalName = _trueOriginalUser.globalName || _realGlobalName; } } catch { }
    let replaced = false;
    if (storedData.createdAt) {
        const realDates = choppeDatesReelles(); const fakeDates = choppeDatesBidons(storedData.createdAt);
        if (realDates.length > 0 && fakeDates.length > 0) {
            for (const realDate of realDates) {
                if (realDate.length >= 4 && val.includes(realDate)) {
                    result = result.split(realDate).join(fakeDates[0]); replaced = true;
                }
            }
        }
    }
    if (_realUsername && storedData.username && result.includes(_realUsername)) { result = result.split(_realUsername).join(storedData.username); replaced = true; }
    if (_realGlobalName && storedData.globalName && result.includes(_realGlobalName)) { result = result.split(_realGlobalName).join(storedData.globalName); replaced = true; }
    if (replaced && result !== node.nodeValue) { if ((node as any).__cp_orig === undefined) (node as any).__cp_orig = val; node.nodeValue = result; }
}

function scanNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) { scanTextNode(node as Text); return; }
    if (node instanceof Element) {
        const tag = node.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "SVG" || tag === "CANVAS" || tag === "VIDEO" || tag === "IFRAME") return;
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
        const parent = n.parentElement;
        if (parent) {
            const tag = parent.tagName;
            if (tag === "SCRIPT" || tag === "STYLE" || tag === "SVG" || tag === "CANVAS") continue;
        }
        scanTextNode(n as Text);
    }
}

function processDomBatch() {
    _domQueued = false;
    if (!isEnabled) { _domMutations = []; return; }
    const batch = _domMutations; _domMutations = [];
    const obs = domObserver;
    if (obs) obs.disconnect();
    try {
        for (const m of batch) {
            if (m.type === "characterData") { scanTextNode(m.target as Text); }
            else { for (const n of m.addedNodes) { scanNode(n); } }
        }
    } finally {
        if (isEnabled && obs) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
}

function startDomObserver() {
    stopDomObserver();
    if (!isEnabled || document.visibilityState === "hidden") return;
    scanNode(document.body);
    domObserver = new MutationObserver(mutations => {
        if (!isEnabled || !mutations.length) return;
        if (document.visibilityState === "hidden") { _domMutations = []; return; }
        _domMutations.push(...mutations);
        if (!_domQueued) { _domQueued = true; setTimeout(processDomBatch, 20); }
    });
    domObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stopDomObserver() {
    domObserver?.disconnect(); domObserver = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) { if ((n as any).__cp_orig !== undefined) { n.nodeValue = (n as any).__cp_orig; delete (n as any).__cp_orig; } }
}

function handleVisibilityChange() {
    if (!isEnabled) return;
    if (document.visibilityState === "visible") { startDomObserver(); }
    else { stopDomObserver(); _domMutations = []; _domQueued = false; }
}

function isMe(userId: string | null | undefined): boolean {
    if (!userId) return false;
    if (_cachedMyId) return _cachedMyId === userId;
    try { const myId = AuthenticationStore?.getId?.(); if (myId) { _cachedMyId = myId; return myId === userId; } } catch { }
    return false;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function EditIcon({ size = 18 }: { size?: number; }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>;
}
function FolderIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z" /></svg>;
}
function CloseIcon() {
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
function TrashIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h4a1 1 0 1 1 0 2h-1.1l-.9 12.1A3 3 0 0 1 17 23H7a3 3 0 0 1-3-2.9L3.1 8H2a1 1 0 0 1 0-2h4V4Zm2 0v2h6V4H9ZM5.1 8l.9 11.9a1 1 0 0 0 1 .1h6a1 1 0 0 0 1-.1L14.9 8H5.1Z" /></svg>;
}
function SaveIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z" /></svg>;
}

// ─── UI Components ────────────────────────────────────────────────────────────

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties; }) {
    return <div className="cp-section-label" style={style}>{children}</div>;
}

function Field({ label, value, placeholder, onChange, type = "text" }: {
    label: string; value: string; placeholder?: string; onChange: (v: string) => void; type?: string;
}) {
    return (
        <div className="cp-field">
            <SectionLabel>{label}</SectionLabel>
            <input className="cp-input" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        </div>
    );
}

function ImageUpload({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void; }) {
    const fileRef = React.useRef<HTMLInputElement>(null);
    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => { if (ev.target?.result) onChange(ev.target.result as string); };
        reader.readAsDataURL(file);
    }
    return (
        <div className="cp-field">
            <SectionLabel>{label}</SectionLabel>
            <div className="cp-image-row">
                <input className="cp-input" placeholder="Image URL..." value={value.startsWith("data:") ? "" : value} onChange={e => onChange(e.target.value)} />
                <button className="cp-file-btn" onClick={() => fileRef.current?.click()}><FolderIcon /></button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
                {value && <>
                    <img src={value} alt="" className="cp-preview-avatar" />
                    <button className="cp-clear-btn" onClick={() => onChange("")}><CloseIcon /></button>
                </>}
            </div>
        </div>
    );
}

function Toggle({ label, checked, onChange, sublabel }: { label: string; checked: boolean; onChange: (v: boolean) => void; sublabel?: string; }) {
    return (
        <div className="cp-toggle-row" onClick={() => onChange(!checked)}>
            <div className="cp-toggle-text">
                <span className="cp-toggle-label">{label}</span>
                {sublabel && <span className="cp-toggle-sub">{sublabel}</span>}
            </div>
            <div className={`cp-toggle ${checked ? "cp-toggle--on" : ""}`}><div className="cp-toggle-thumb" /></div>
        </div>
    );
}

function BadgeBtn({ label, icon, active, onClick }: { label: string; icon?: string; active: boolean; onClick: () => void; }) {
    return (
        <button onClick={onClick} className={`cp-badge ${active ? "cp-badge--on" : ""}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {icon && <img src={icon} alt="" style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }} />}
            <span>{label}</span>
        </button>
    );
}

function BadgePicker({ selected, onChange, nitroType, onNitroType, boostLevel, onBoostLevel, customIds, onCustomIds, oldName, onOldName }: {
    selected: number; onChange: (v: number) => void;
    nitroType: number; onNitroType: (v: number) => void;
    boostLevel: number; onBoostLevel: (v: number) => void;
    customIds: string[]; onCustomIds: (v: string[]) => void;
    oldName: string; onOldName: (v: string) => void;
}) {
    const hasOldName = customIds.includes("oldname");
    return (
        <div className="cp-field">
            <SectionLabel>Badges</SectionLabel>
            <div className="cp-badges">
                {BADGES.map(b => (
                    <BadgeBtn key={b.flag} label={b.label} icon={b.icon} active={!!(selected & b.flag)} onClick={() => onChange(selected ^ b.flag)} />
                ))}
            </div>
            <SectionLabel style={{ marginTop: 8 }}>Evolving Nitro Badge</SectionLabel>
            <div className="cp-badges">
                <BadgeBtn label="None" active={nitroType === -1} onClick={() => onNitroType(-1)} />
                {NITRO_LEVELS.map((n, i) => (
                    <BadgeBtn key={i} label={n.label} icon={n.icon} active={nitroType === i} onClick={() => onNitroType(i)} />
                ))}
            </div>
            <SectionLabel style={{ marginTop: 8 }}>Special Badges</SectionLabel>
            <div className="cp-badges">
                <BadgeBtn label="Completed a quest"
                    icon="https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png"
                    active={customIds.includes("quest")}
                    onClick={() => onCustomIds(customIds.includes("quest") ? customIds.filter(x => x !== "quest") : [...customIds, "quest"])} />
                <BadgeBtn label="Old username" icon={OLD_NAME_BADGE_ICON} active={hasOldName}
                    onClick={() => onCustomIds(hasOldName ? customIds.filter(x => x !== "oldname") : [...customIds, "oldname"])} />
            </div>
            {hasOldName && (
                <div className="cp-field" style={{ marginTop: 6 }}>
                    <SectionLabel style={{ marginTop: 0 }}>Old username (shown in badge tooltip)</SectionLabel>
                    <input className="cp-input" value={oldName} placeholder="OldUser#0000" onChange={e => onOldName(e.target.value)} />
                </div>
            )}
            <SectionLabel style={{ marginTop: 8 }}>Boost Badge</SectionLabel>
            <div className="cp-badges">
                <BadgeBtn label="None" active={boostLevel === -1} onClick={() => onBoostLevel(-1)} />
                {BOOST_LABELS.map((lbl, i) => (
                    <BadgeBtn key={i} label={lbl} icon={BOOST_ICONS[i]} active={boostLevel === i} onClick={() => onBoostLevel(i)} />
                ))}
            </div>
        </div>
    );
}

function forceAccountPanelRerender() {
    try {
        if (UserStore?.emitChange) UserStore.emitChange();
        if (UserProfileStore?.emitChange) UserProfileStore.emitChange();
        const WP = (Vencord as any).Webpack;
        const MAS = WP?.findByProps?.("getUsers", "getValidUsers", "getHasLoggedInAccounts");
        if (MAS?.emitChange) MAS.emitChange();
        FluxDispatcher.dispatch({ type: "USER_SETTINGS_PROTO_UPDATE", settings: { type: 1, proto: {} } });
        if (isEnabled) startDomObserver();
        else stopDomObserver();
    } catch { }
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

function CustomProfileModal({ rootProps }: { rootProps: any; }) {
    const myId = AuthenticationStore?.getId?.() || "";
    const [selectedAccountId, setSelectedAccountId] = React.useState(myId);
    const [data, setData] = React.useState<CustomProfileData>(() => ({ ...(allAccountsData[myId] || storedData || {}) }));
    const [saving, setSaving] = React.useState(false);
    const nitroLevel = data.nitroLevel ?? -1;
    const boostLevel = data.boostMonths ?? -1;
    const customIds = data.customBadgeIds ?? [];
    const oldName = data.oldName ?? "";

    const accounts = React.useMemo(() => {
        try {
            const MAS = (window as any).Vencord?.Webpack?.findByProps?.("getUsers", "getValidUsers");
            if (MAS?.getUsers) {
                const users = MAS.getUsers();
                if (Array.isArray(users) && users.length > 0) return users;
            }
        } catch { }
        const me = UserStore.getCurrentUser();
        return me ? [me] : [];
    }, []);

    React.useEffect(() => {
        setData({ ...(allAccountsData[selectedAccountId] || {}) });
    }, [selectedAccountId]);

    function set<K extends keyof CustomProfileData>(key: K, val: CustomProfileData[K]) {
        setData(d => ({ ...d, [key]: val }));
    }

    async function save() {
        try {
            setSaving(true);
            const savedData = { ...data };

            allAccountsData[selectedAccountId] = savedData;
            allAccountsEnabled[selectedAccountId] = true;

            if (selectedAccountId === myId) {
                storedData = savedData;
                isEnabled = true;
                saveDataSync(storedData, true);
                cachedFakeUser = null;
                cachedOriginalUser = null;
                leCacheU = null;
                leCacheI = null;
                cacheDatesR = [];
                cacheDatesF = [];
                _dataVersion++;
            }

            // Save locally — no server sync
            saveAllDataSync();
            DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { });
            DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });

            updateCachedRealData();
            forceAccountPanelRerender();
        } catch (err) {
            console.error("[CustomProfile] save error:", err);
        } finally {
            setSaving(false);
            rootProps.onClose();
        }
    }

    async function reset() {
        delete allAccountsData[selectedAccountId];
        delete allAccountsEnabled[selectedAccountId];

        if (selectedAccountId === myId) {
            storedData = {};
            isEnabled = false;
            saveDataSync({}, false);
            cachedFakeUser = null;
            cachedOriginalUser = null;
            _trueOriginalUser = null;
            leCacheU = null;
            leCacheI = null;
            cacheDatesR = [];
            cacheDatesF = [];
            _dataVersion++;
        }

        saveAllDataSync();
        DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { });
        DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
        DataStore.set(DS_KEY, {}).catch(() => { });
        DataStore.set(DS_ENABLED, false).catch(() => { });

        forceAccountPanelRerender();
        rootProps.onClose();
    }

    const accentHex = data.accentColor != null ? "#" + data.accentColor.toString(16).padStart(6, "0") : "";

    return (
        <ModalRoot {...rootProps} size="medium">
            <ModalHeader separator={false}>
                <div className="cp-header">
                    <EditIcon size={16} />
                    <span className="cp-header-title">Custom Profile</span>
                </div>
                {accounts.length > 1 && (
                    <div style={{ marginLeft: "auto", marginRight: 8, minWidth: 200 }}>
                        <Select
                            options={accounts.map((acc: any) => ({ value: acc.id, label: acc.globalName || acc.username }))}
                            isSelected={(v: string) => v === selectedAccountId}
                            select={(v: string) => setSelectedAccountId(v)}
                            serialize={(v: string) => v}
                            renderOptionLabel={(o: any) => (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <img src={IconUtils.getUserAvatarURL(accounts.find((a: any) => a.id === o.value), false, 20)} style={{ borderRadius: "50%", width: 20, height: 20 }} />
                                    {o.label}
                                </div>
                            )}
                            renderOptionValue={(selected: any[]) => {
                                const option = selected[0];
                                if (!option) return "Select Account";
                                return (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <img src={IconUtils.getUserAvatarURL(accounts.find((a: any) => a.id === option.value), false, 20)} style={{ borderRadius: "50%", width: 20, height: 20 }} />
                                        {option.label}
                                    </div>
                                );
                            }}
                        />
                    </div>
                )}
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent className="cp-content">
                <Field label="Username" value={data.username ?? ""} placeholder="my_username_00" onChange={v => set("username", v)} />
                <Field label="Display name" value={data.globalName ?? ""} placeholder="My Name" onChange={v => set("globalName", v)} />
                <ImageUpload label="Profile picture" value={data.avatar ?? ""} onChange={v => set("avatar", v)} />
                <Toggle label="Simulate Nitro" sublabel="Enables banner and profile color" checked={data.nitro ?? false} onChange={v => set("nitro", v)} />
                {data.nitro && <ImageUpload label="Banner" value={data.banner ?? ""} onChange={v => set("banner", v)} />}
                <div className="cp-divider" />
                <Field label="Bio" value={data.bio ?? ""} placeholder="My description..." onChange={v => set("bio", v)} />
                <Field label="Pronouns" value={data.pronouns ?? ""} placeholder="he/him" onChange={v => set("pronouns", v)} />
                <div className="cp-field">
                    <SectionLabel>Profile color (gradient supported with Nitro)</SectionLabel>
                    <div className="cp-color-row" style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>Color 1</span>
                        <input type="color" value={accentHex || "#5865f2"} onChange={e => { const n = parseInt(e.target.value.replace("#", ""), 16); if (!isNaN(n)) set("accentColor", n); }} className="cp-color-swatch" />
                        <input value={accentHex} placeholder="#5865f2" onChange={e => { const h = e.target.value.replace("#", ""); const n = parseInt(h, 16); if (!isNaN(n) && h.length === 6) set("accentColor", n); else if (!e.target.value) set("accentColor", undefined); }} className="cp-input cp-color-input" />
                        {data.accentColor != null && <button className="cp-clear-btn" onClick={() => set("accentColor", undefined)}><CloseIcon /></button>}
                    </div>
                    <div className="cp-color-row">
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>Color 2</span>
                        {(() => {
                            const hex2 = data.accentColor2 != null ? "#" + data.accentColor2.toString(16).padStart(6, "0") : "";
                            return (<>
                                <input type="color" value={hex2 || "#eb459e"} onChange={e => { const n = parseInt(e.target.value.replace("#", ""), 16); if (!isNaN(n)) set("accentColor2", n); }} className="cp-color-swatch" />
                                <input value={hex2} placeholder="#eb459e (optional)" onChange={e => { const h = e.target.value.replace("#", ""); const n = parseInt(h, 16); if (!isNaN(n) && h.length === 6) set("accentColor2", n); else if (!e.target.value) set("accentColor2", undefined); }} className="cp-input cp-color-input" />
                                {data.accentColor2 != null && <button className="cp-clear-btn" onClick={() => set("accentColor2", undefined)}><CloseIcon /></button>}
                            </>);
                        })()}
                    </div>
                </div>
                <Field label="Account creation date" value={data.createdAt ?? ""} placeholder="2010-06-29" type="date" onChange={v => set("createdAt", v)} />
                <Field label="Email (local display only)" value={data.email ?? ""} placeholder="example@mail.com" onChange={v => set("email", v)} />
                <Field label="Phone (local display only)" value={data.phone ?? ""} placeholder="+1 555 000 0000" onChange={v => set("phone", v)} />
                <div className="cp-divider" />
                <BadgePicker
                    selected={data.badgeFlags ?? 0} onChange={v => set("badgeFlags", v)}
                    nitroType={nitroLevel} onNitroType={v => { set("nitroLevel", v as any); if (v >= 1) set("nitro", true); }}
                    boostLevel={boostLevel} onBoostLevel={v => set("boostMonths", v)}
                    customIds={customIds} onCustomIds={v => set("customBadgeIds", v)}
                    oldName={oldName} onOldName={v => set("oldName", v)}
                />
                <div className="cp-divider" />
                <SectionLabel>Avatar decoration</SectionLabel>
                <div className="cp-badges" style={{ flexWrap: "wrap", gap: 6 }}>
                    <button onClick={() => set("decorationAsset", undefined)} className={`cp-badge ${!data.decorationAsset ? "cp-badge--on" : ""}`} style={{ minWidth: 60 }}>
                        None
                    </button>
                    {AVATAR_DECORATIONS.map(dec => (
                        <button key={dec.id}
                            onClick={() => set("decorationAsset", data.decorationAsset === dec.id ? undefined : dec.id)}
                            className={`cp-badge ${data.decorationAsset === dec.id ? "cp-badge--on" : ""}`}
                            title={dec.label} style={{ padding: 3, lineHeight: 0, width: 52, height: 52, borderRadius: 6 }}>
                            <img src={getDecorationUrl(dec.id)} alt={dec.label} style={{ width: 46, height: 46, objectFit: "contain", display: "block" }} />
                        </button>
                    ))}
                </div>
                <div className="cp-hint">All settings are saved locally on your device only.</div>
            </ModalContent>
            <ModalFooter className="cp-footer">
                <button className="cp-btn cp-btn-ghost" onClick={rootProps.onClose}>Cancel</button>
                <button className="cp-btn cp-btn-danger" onClick={reset}><TrashIcon /><span>Reset</span></button>
                <button className="cp-btn cp-btn-primary" onClick={save} disabled={saving}><SaveIcon /><span>{saving ? "Saving..." : "Save"}</span></button>
            </ModalFooter>
        </ModalRoot>
    );
}

function CustomProfileButton() {
    return <HeaderBarButton icon={() => <EditIcon size={18} />} tooltip="Custom Profile" onClick={() => openModal(props => <CustomProfileModal rootProps={props} />)} />;
}

export default definePlugin({
    name: "CustomProfile",
    enabledByDefault: true,
    description: "Visually customize your Discord profile (username, PFP, banner, badges, bio...) — saved locally only, never sent to any server.",
    authors: [{ name: "Nightcord (adapted)", id: 0n }],
    dependencies: ["HeaderBarAPI", "ContextMenuAPI"],

    patches: [
        {
            find: '"SHOULD_LOAD");',
            replacement: {
                match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
                replace: "$self.patchBannerUrl(arguments[0])||$&"
            }
        },
        {
            find: ".WIDGETS_RTC_UPSELL_COACHMARK)",
            replacement: {
                match: /currentUser:(\i)(?=.{0,200}voiceDb)/,
                replace: "currentUser:$self.fakeCurrentUser($1)"
            }
        },
        {
            find: "DISPLAY_NAME",
            noWarn: true,
            replacement: {
                match: /(?<=currentUser:\i,user:)(\i)/,
                replace: "$self.fakeCurrentUser($1)"
            }
        },
        {
            find: "obfuscatedEmail",
            noWarn: true,
            replacement: [
                { match: /obfuscatedEmail:(\i)/, replace: "obfuscatedEmail:$self.fakeObfuscatedEmail($1)" },
                { match: /obfuscatedPhone:(\i)/, replace: "obfuscatedPhone:$self.fakeObfuscatedPhone($1)" }
            ]
        },
        {
            find: "isHoveringOrFocusing",
            replacement: [{
                noWarn: true,
                match: /user:([A-Za-z_$][\w$]*),displayProfile:([A-Za-z_$][\w$]*),themeType/,
                replace: "user:$self.fakeCurrentUser($1),displayProfile:$2,themeType"
            }]
        },
        {
            find: "AccountPanel",
            replacement: [{ match: /user:([a-zA-Z0-9_]+),/, replace: "user:$self.fakeCurrentUser($1)," }]
        },
        {
            find: "UserAccountSettings",
            replacement: [
                { match: /user:([a-zA-Z0-9_]+),/, replace: "user:$self.fakeCurrentUser($1)," },
                { match: /email:([^,}]+),/, replace: "email:$self.fakeObfuscatedEmail($1)," }
            ]
        },
    ],

    fakeCurrentUser(user: any) {
        if (!user || !isEnabled || !isMe(user.id)) return user;
        if (cachedOriginalUser === user && cachedFakeUser && cachedDataHash === _dataVersion) return cachedFakeUser;

        const realUser = (user as any).__cp_isClone ? _trueOriginalUser || user : user;
        if (!realUser.__cp_isClone) _trueOriginalUser = realUser;

        const realUsername = realUser.__cp_isClone ? (realUser._realUsername || realUser.username) : realUser.username;
        const realGlobalName = realUser.__cp_isClone ? (realUser._realGlobalName ?? realUser.globalName) : realUser.globalName;
        const realDisplayName = realUser.__cp_isClone ? (realUser._realDisplayName ?? realUser.displayName) : realUser.displayName;

        const clone = Object.create(Object.getPrototypeOf(realUser));
        for (const key of Reflect.ownKeys(realUser)) {
            if (key === "username" || key === "globalName" || key === "displayName" || key === "__cp_isClone") continue;
            const desc = Object.getOwnPropertyDescriptor(realUser, key);
            if (desc) Object.defineProperty(clone, key, desc);
        }
        Object.defineProperty(clone, "__cp_isClone", { value: true, enumerable: false, configurable: true });
        clone._realUsername = realUsername;
        clone._realGlobalName = realGlobalName;
        clone._realDisplayName = realDisplayName;

        const fakeUser = storedData.username || realUsername;
        const hasCustomGlobalName = !!storedData.globalName;
        const fakeGlobal = hasCustomGlobalName ? storedData.globalName : realGlobalName;
        const fakeDisplay = hasCustomGlobalName ? (storedData.globalName || realGlobalName || realUsername) : (realGlobalName || realDisplayName || realUsername);

        Object.defineProperty(clone, "username", { get: () => isEnabled ? fakeUser : realUsername, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "globalName", { get: () => isEnabled ? fakeGlobal : realGlobalName, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "displayName", { get: () => isEnabled ? fakeDisplay : (realDisplayName || realGlobalName || realUsername), set: () => { }, configurable: true, enumerable: true });

        if (storedData.email) clone.email = storedData.email;
        if (storedData.phone) clone.phone = storedData.phone;
        clone.getTag = () => (storedData.username || realUsername) + "#0000";
        clone.getGlobalName = () => isEnabled ? fakeGlobal : realGlobalName;
        clone.toString = () => fakeDisplay;

        if (storedData.createdAt) {
            const fakeCreatedAt = new Date(storedData.createdAt + "T12:00:00Z");
            Object.defineProperty(clone, "createdAt", { get: () => fakeCreatedAt, configurable: true, enumerable: true });
        }

        if (storedData.decorationAsset) {
            clone.avatarDecoration = null;
            clone.avatarDecorationData = { asset: storedData.decorationAsset, skuId: storedData.decorationAsset };
        }

        const wantedFlags = storedData.badgeFlags != null ? storedData.badgeFlags : realUser.publicFlags;
        clone.publicFlags = wantedFlags;
        clone.flags = wantedFlags;

        if (storedData.nitro) {
            clone.premiumType = 2;
            const LEVEL_MONTHS = [1, 2, 3, 6, 12, 24, 36, 72];
            const since = new Date();
            since.setMonth(since.getMonth() - (LEVEL_MONTHS[storedData.nitroLevel!] ?? 1));
            clone.premiumSince = since;
            const bm = storedData.boostMonths ?? -1;
            if (bm >= 0) {
                const BOOST_M = [1, 2, 3, 6, 9, 12, 15, 18, 24];
                const boostSince = new Date();
                boostSince.setMonth(boostSince.getMonth() - (BOOST_M[bm] ?? 1));
                clone.premiumGuildSince = boostSince;
            } else {
                clone.premiumGuildSince = null;
            }
        } else if (storedData.nitro === false) {
            clone.premiumType = 0;
            clone.premiumSince = null;
            clone.premiumGuildSince = null;
        }

        cachedOriginalUser = user;
        cachedFakeUser = clone;
        cachedDataHash = _dataVersion;
        return clone;
    },

    hookUserProfile(profile: any) {
        if (!profile || !isEnabled) return profile;
        try {
            const merged: any = {};
            if (storedData.bio) merged.bio = storedData.bio;
            if (storedData.pronouns) merged.pronouns = storedData.pronouns;
            if (storedData.accentColor != null) merged.accentColor = storedData.accentColor;
            if (storedData.banner) merged.banner = storedData.banner;
            if (storedData.decorationAsset) {
                merged.avatarDecoration = null;
                merged.avatarDecorationData = { asset: storedData.decorationAsset, skuId: storedData.decorationAsset };
            }
            if (storedData.nitro || storedData.badgeFlags != null) {
                merged.premiumType = storedData.nitro ? 2 : 0;
                if (storedData.nitro) {
                    if (storedData.accentColor != null) {
                        merged.themeColors = [storedData.accentColor, storedData.accentColor2 ?? storedData.accentColor];
                    }
                    const nl = storedData.nitroLevel ?? 0;
                    const LEVEL_MONTHS = [1, 2, 3, 6, 12, 24, 36, 72];
                    const since = new Date();
                    since.setMonth(since.getMonth() - (LEVEL_MONTHS[nl] ?? 1));
                    merged.premiumSince = since;
                    const bm = storedData.boostMonths ?? -1;
                    if (bm >= 0) {
                        const BOOST_M = [1, 2, 3, 6, 9, 12, 15, 18, 24];
                        const boostSince = new Date();
                        boostSince.setMonth(boostSince.getMonth() - (BOOST_M[bm] ?? 1));
                        merged.premiumGuildSince = boostSince;
                    } else {
                        merged.premiumGuildSince = null;
                    }
                } else {
                    merged.premiumSince = null;
                    merged.premiumGuildSince = null;
                }
                merged.publicFlags = storedData.badgeFlags != null ? storedData.badgeFlags : profile.publicFlags;
                merged.badges = [];
            }
            return virtualMerge(profile, merged);
        } catch { return profile; }
    },

    fakeObfuscatedEmail(real: string | null) {
        if (!isEnabled || !storedData.email || !real) return real;
        const fake = storedData.email;
        const atIdx = fake.indexOf("@");
        if (atIdx <= 1) return fake;
        return fake[0] + "***" + fake.slice(atIdx - 1);
    },

    fakeObfuscatedPhone(real: string | null) {
        if (!isEnabled || !storedData.phone || !real) return real;
        const fake = storedData.phone;
        if (fake.length < 4) return fake;
        return "***-***-" + fake.slice(-4);
    },

    patchBannerUrl({ displayProfile }: any) {
        try {
            const uid = displayProfile?.userId;
            if (!uid) return null;
            if (isEnabled && storedData.nitro && storedData.banner && isMe(uid)) return storedData.banner;
            return null;
        } catch { return null; }
    },

    _origExtractTimestamp: null as any,

    userProfileBadges: [
        {
            getBadges({ userId, badges: nativeBadges }: { userId: string; guildId: string; badges: ProfileBadge[]; }) {
                const style = { borderRadius: "50%", width: "22px", height: "22px" };
                const isCurrentUser = userId === UserStore.getCurrentUser()?.id;
                if (!isCurrentUser || !isEnabled) return nativeBadges || [];

                let badges: ProfileBadge[] = [...(nativeBadges || [])];
                const nl = storedData.nitroLevel ?? -1;
                const bm = storedData.boostMonths ?? -1;
                const wantedFlags = storedData.badgeFlags ?? 0;

                badges = badges.filter(b => {
                    const desc = (b.description || "").toLowerCase();
                    const icon = (b.iconSrc || "").toLowerCase();
                    const nitroKw = ["nitro", "subscriber", "premium"];
                    if (nitroKw.some(k => desc.includes(k))) return false;
                    if (icon.includes("nitro") || icon.includes("premium")) return false;
                    const boostKw = ["booster", "boost"];
                    if (boostKw.some(k => desc.includes(k))) return false;
                    if (icon.includes("boost") || icon.includes("leveling")) return false;
                    for (const badge of BADGES) {
                        if (wantedFlags & badge.flag) {
                            const iconHash = badge.icon.split("/").pop()?.replace(".png", "") ?? "";
                            if (icon.includes(iconHash)) return false;
                        }
                    }
                    return true;
                });

                const badgeList: ProfileBadge[] = [];
                for (const badge of BADGES) {
                    if (wantedFlags & badge.flag) badgeList.push({ id: `cp-badge-${badge.flag}`, description: badge.label, iconSrc: badge.icon, position: 0, props: { style } });
                }
                if (nl >= 0 && nl < NITRO_LEVELS.length) badgeList.push({ id: `cp-nitro-${nl}`, description: "Nitro", iconSrc: NITRO_LEVELS[nl].icon, position: 0, props: { style } });
                if (bm >= 0 && bm < BOOST_ICONS.length) badgeList.push({ id: `cp-boost-${bm}`, description: `Server Booster — ${BOOST_LABELS[bm]}`, iconSrc: BOOST_ICONS[bm], position: 0, props: { style } });
                if (storedData.customBadgeIds?.includes("quest")) badgeList.push({ id: "cp-quest", description: "Completed a quest", iconSrc: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png", position: 0, props: { style } });
                if (storedData.customBadgeIds?.includes("oldname")) {
                    const txt = storedData.oldName ? `Old username: ${storedData.oldName}` : "Old username";
                    badgeList.push({ id: "cp-oldname", description: txt, iconSrc: OLD_NAME_BADGE_ICON, position: 0, props: { style } });
                }

                badges.push(...badgeList);
                return badges;
            }
        } as ProfileBadge
    ] as ProfileBadge[],

    async start() {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        applyAvatarPatchEarly();
        addHeaderBarButton("custom-profile-btn", () => <CustomProfileButton />, 10);
        addContextMenuPatch("user-context", userContextMenuPatch);
        FluxDispatcher.subscribe("CONNECTION_OPEN", onAccountSwitch);

        try {
            const US = (Vencord as any).Webpack?.findByProps?.("getCurrentUser", "getUser");
            if (US && !US._cp_perfect_hook) {
                const origCurrent = US.getCurrentUser.bind(US);
                let _lastRealUser: any = null;
                let _lastFakeResult: any = null;
                let _lastCacheVersion = -1;
                US.getCurrentUser = () => {
                    const realUser = origCurrent();
                    if (realUser) {
                        if (realUser !== _lastRealUser) {
                            if (realUser.username) _realUsername = realUser.username;
                            if (realUser.globalName) _realGlobalName = realUser.globalName;
                        }
                        if (realUser === _lastRealUser && _lastCacheVersion === _dataVersion && _lastFakeResult) return _lastFakeResult;
                        _lastRealUser = realUser;
                        _lastCacheVersion = _dataVersion;
                        _lastFakeResult = this.fakeCurrentUser(realUser);
                        return _lastFakeResult;
                    }
                    return this.fakeCurrentUser(realUser);
                };
                US._cp_perfect_hook = true;
            }
        } catch { }

        try {
            const UPS = (Vencord as any).Webpack?.findByProps?.("getUserProfile", "getGuildMemberProfile");
            if (UPS && !UPS._cp_profile_hook) {
                const origGetProfile = UPS.getUserProfile.bind(UPS);
                UPS.getUserProfile = (userId: string) => {
                    try {
                        const profile = origGetProfile(userId);
                        if (isEnabled && isMe(userId) && profile) return this.hookUserProfile(profile);
                        return profile;
                    } catch { return origGetProfile(userId); }
                };
                const origGetGuild = UPS.getGuildMemberProfile.bind(UPS);
                UPS.getGuildMemberProfile = (userId: string, guildId: string) => {
                    try {
                        const profile = origGetGuild(userId, guildId);
                        if (isEnabled && isMe(userId) && profile) return this.hookUserProfile(profile);
                        return profile;
                    } catch { return origGetGuild(userId, guildId); }
                };
                UPS._cp_profile_hook = true;
            }
        } catch { }

        try {
            if (SnowflakeUtils?.extractTimestamp && !this._origExtractTimestamp) {
                this._origExtractTimestamp = SnowflakeUtils.extractTimestamp;
                const origExtract = this._origExtractTimestamp;
                (SnowflakeUtils as any).extractTimestamp = (snowflake: string) => {
                    if (isEnabled && storedData.createdAt && isMe(snowflake)) {
                        return new Date(storedData.createdAt + "T12:00:00Z").getTime();
                    }
                    return origExtract(snowflake);
                };
            }
        } catch { }

        try {
            if (GuildMemberStore?.getMember && !(GuildMemberStore as any)._cp_member_hook) {
                const _origGetMember = GuildMemberStore.getMember.bind(GuildMemberStore);
                (GuildMemberStore as any).getMember = (guildId: string, userId: string) => {
                    const member = _origGetMember(guildId, userId);
                    try {
                        const myId = UserStore.getCurrentUser()?.id;
                        if (isEnabled && userId === myId && member) {
                            const customNick = storedData.globalName || storedData.username;
                            if (customNick) return { ...member, nick: customNick };
                        }
                    } catch { }
                    return member;
                };
                (GuildMemberStore as any)._cp_member_hook = true;
                (GuildMemberStore as any)._cp_orig_getMember = _origGetMember;
            }
        } catch { }

        try {
            const decoMod = (Vencord as any).Webpack?.findByProps?.("getAvatarDecorationURL");
            if (decoMod?.getAvatarDecorationURL) {
                const origDeco = decoMod.getAvatarDecorationURL.bind(decoMod);
                decoMod.getAvatarDecorationURL = (opts: any) => {
                    try {
                        const { avatarDecoration, userId } = opts ?? {};
                        if (isEnabled && storedData.decorationAsset) {
                            const myId = UserStore.getCurrentUser()?.id;
                            const isOurs = (avatarDecoration?.asset === storedData.decorationAsset) || (userId && userId === myId);
                            if (isOurs) {
                                const asset = storedData.decorationAsset;
                                const dec = AVATAR_DECORATIONS.find(d => d.id === asset);
                                return getDecorationUrl(asset, dec ? (dec as any).passthrough : asset.startsWith("a_"));
                            }
                        }
                    } catch { }
                    return origDeco(opts);
                };
            }
        } catch { }

        loadData().then(() => {
            updateCachedRealData();
            if (!_avatarPatchApplied) applyAvatarPatchEarly();
            if (isEnabled) {
                forceAccountPanelRerender();
                requestAnimationFrame(() => removeHideStyle());
            } else {
                removeHideStyle();
            }
        });
    },

    stop() {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        removeHeaderBarButton("custom-profile-btn");
        removeContextMenuPatch("user-context", userContextMenuPatch);
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", onAccountSwitch);
        stopDomObserver();
        removeHideStyle();
        if (this._origExtractTimestamp && SnowflakeUtils) {
            (SnowflakeUtils as any).extractTimestamp = this._origExtractTimestamp;
            this._origExtractTimestamp = null;
        }
        try {
            if ((GuildMemberStore as any)?._cp_member_hook) {
                if ((GuildMemberStore as any)._cp_orig_getMember) GuildMemberStore.getMember = (GuildMemberStore as any)._cp_orig_getMember;
                delete (GuildMemberStore as any)._cp_member_hook;
                delete (GuildMemberStore as any)._cp_orig_getMember;
            }
        } catch { }
    },

    settingsAboutComponent() {
        return <Button onClick={() => openModal(props => <CustomProfileModal rootProps={props} />)}>Open Custom Profile</Button>;
    },
});
