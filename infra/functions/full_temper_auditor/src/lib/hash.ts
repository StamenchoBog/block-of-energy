import * as crypto from 'crypto';

// Helper function for canonical JSON stringification
export const getCanonicalString = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(item => getCanonicalString(item)).join(',')}]`;
    }
    const sortedKeys = Object.keys(obj).sort();
    const keyValuePairs = sortedKeys.map(key => `"${key}":${getCanonicalString(obj[key])}`);
    return `{${keyValuePairs.join(',')}}`;
};

export function calculateHash(data: any): string {
    const canonicalString = getCanonicalString(data);
    return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
