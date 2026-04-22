import { FLAG_SCHEMAS, FLAGS } from "./constants.js";
import { validatePort, validateOpenPath } from "./util.js";
import { validateHost } from "./validateHost.js";

const isValidFlag = (arg) => {
    if (!arg.startsWith("--")) {
        return false;
    }

    return FLAGS.includes(arg);
};

export const tokenizer = (args) => {
    const flagArgs = args.slice(2);
    const argMap = {};
    let i = 0;

    while (i < flagArgs.length) {
        const flag = flagArgs[i];

        if (!isValidFlag(flag)) {
            return { ok: false, error: `Invalid flag: ${flag}` };
        }

        const flagType = FLAG_SCHEMAS[flag].type;

        if (flagType === 'number') {
            const next = flagArgs[i + 1];
            if (next === undefined || next.startsWith("--")) {
                return { ok: false, error: `Missing value for ${flag}. Expected a number.` };
            }
            if (isNaN(Number(next))) {
                return { ok: false, error: `Invalid value for ${flag}. Expected a number.` };
            }

            argMap[flag] = next;
            i += 2;
        } else if (flagType === 'string') {
            const next = flagArgs[i + 1];
            if (next === undefined || next.startsWith("--")) {
                return { ok: false, error: `Missing value for ${flag}. Expected a string.` };
            }

            argMap[flag] = next;
            i += 2;
        } else {
            argMap[flag] = true;
            i++;
        }
    }

    return { ok: true, value: argMap };
};

export const extractFlags = (args) => {
    const result = tokenizer(args);
    if (!result.ok) return result;

    const argMap = result.value;
    const values = {};

    for (const [flag, schema] of Object.entries(FLAG_SCHEMAS)) {
        if (!(flag in argMap)) {
            values[schema.name] = undefined;
            continue;
        }

        if (schema.type === 'number') {
            values[schema.name] = Number(argMap[flag]);
        } else if (schema.type === 'string') {
            values[schema.name] = argMap[flag];
        } else {
            values[schema.name] = true;
        }
    }

    return { ok: true, value: values };
};

export const validateFlags = async (values) => {
    if (values.port !== undefined) {
        const result = validatePort(values.port);
        if (!result.ok) return { ok: false, error: `--port: ${result.error}` };
    }

    if (values.host !== undefined) {
        const result = await validateHost(values.host);
        if (!result.ok) return { ok: false, error: `--host: ${result.error}` };
    }

    if (values.open !== undefined) {
        const result = validateOpenPath(values.open);
        if (!result.ok) return { ok: false, error: `--open: ${result.error}` };
    }

    return { ok: true };
};
