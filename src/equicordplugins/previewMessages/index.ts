import definePlugin, { OptionType } from "@utils/types";
import { Settings } from "@api/Settings";

const PurecordDevs = {
    roffelcoppter: {
        name: "roffelcoppter",
        id: 725316786949718036n,
    },
} as const;

export default definePlugin({
    name: "ReadStatusSpoof",
    description: "Marks channels as read locally without acking Discord's servers, keeping your unread state on other devices.",
    authors: [PurecordDevs.roffelcoppter],
    tags: ["read", "ack", "privacy", "unread"],

    options: {
        spoofByDefault: {
            type: OptionType.BOOLEAN,
            description: "Enable read spoofing on launch",
            default: true,
        },
        suppressTyping: {
            type: OptionType.BOOLEAN,
            description: "Also suppress typing indicators while spoofing is active",
            default: false,
        },
    },

    patches: [
        {
            find: "ChannelAck",
            replacement: {
                match: /(\w+)\.post\(\{url:(\w+)\.CHANNEL_ACK\((\w+)\)/,
                replace: "$self._interceptAck(()=>$1.post({url:$2.CHANNEL_ACK($3))",
            },
        },
        {
            find: "TYPING_START_LOCAL",
            predicate: () => Settings.plugins.ReadStatusSpoof.suppressTyping,
            replacement: {
                match: /(\w+)\.post\(\{url:(\w+)\.TYPING\b/,
                replace: "$self._interceptTyping(()=>$1.post({url:$2.TYPING",
            },
        },
    ],

    _active: true as boolean,

    start() {
        this._active = Settings.plugins.ReadStatusSpoof.spoofByDefault;
    },

    stop() {},

    _interceptAck(realCall: () => void) {
        if (this._active) return;
        return realCall();
    },

    _interceptTyping(realCall: () => void) {
        if (this._active && Settings.plugins.ReadStatusSpoof.suppressTyping) return;
        return realCall();
    },

    toggle() {
        this._active = !this._active;
        return this._active;
    },
});
