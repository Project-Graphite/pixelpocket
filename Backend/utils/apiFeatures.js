// Filters, searches, sorts and pages a query from the query string. Only the fields a route
// lists can be filtered, sorted or selected, so clients can't reach hidden fields.

const OPERATORS = ['gte', 'gt', 'lte', 'lt'];
const MAX_SEARCH_LENGTH = 60;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Query values must be plain strings; arrays and objects (from ?a[]=1 or ?a[$ne]=1) are ignored
const asString = (value) => (typeof value === 'string' ? value : undefined);

const castValue = (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    return value;
};

class APIFeatures {
    constructor(query, queryString, options = {}) {
        this.query = query;
        this.queryString = queryString || {};
        this.options = {
            filterable: [],
            sortable: [],
            selectable: [],
            searchable: null,
            defaultSort: '-createdAt',
            defaultLimit: 20,
            maxLimit: 100,
            ...options,
        };
        // Base conditions plus what filter() and search() add, for counting
        this.conditions = { ...query.getFilter() };
        this.page = 1;
        this.limit = this.options.defaultLimit;
    }

    filter() {
        const extra = {};
        for (const field of this.options.filterable) {
            const raw = this.queryString[field];
            const value = asString(raw);

            if (value !== undefined) {
                extra[field] = castValue(value);
            } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                // ?romSize[gte]=1000 style ranges, for whitelisted fields only
                const range = {};
                for (const op of OPERATORS) {
                    const opValue = asString(raw[op]);
                    if (opValue !== undefined) range[`$${op}`] = castValue(opValue);
                }
                if (Object.keys(range).length) extra[field] = range;
            }
        }
        Object.assign(this.conditions, extra);
        this.query = this.query.find(extra);
        return this;
    }

    // Case-insensitive "contains" search; the text is escaped so it can't act as a regex
    search() {
        const field = this.options.searchable;
        const text = asString(this.queryString.search);
        if (field && text && text.trim()) {
            const condition = {
                [field]: {
                    $regex: escapeRegex(text.trim().slice(0, MAX_SEARCH_LENGTH)),
                    $options: 'i',
                },
            };
            Object.assign(this.conditions, condition);
            this.query = this.query.find(condition);
        }
        return this;
    }

    sort() {
        const requested = (asString(this.queryString.sort) || '')
            .split(',')
            .map((s) => s.trim())
            .filter((s) => this.options.sortable.includes(s.replace(/^-/, '')));
        const sortBy = requested.length ? requested.join(' ') : this.options.defaultSort;
        // _id breaks ties so pages never overlap or skip items
        this.query = this.query.sort(`${sortBy} -_id`).collation({ locale: 'en', strength: 2 });
        return this;
    }

    limitFields() {
        const requested = (asString(this.queryString.fields) || '')
            .split(',')
            .map((s) => s.trim())
            .filter((s) => this.options.selectable.includes(s));
        this.query = this.query.select(requested.length ? requested.join(' ') : '-__v');
        return this;
    }

    paginate() {
        const page = parseInt(asString(this.queryString.page), 10);
        const limit = parseInt(asString(this.queryString.limit), 10);
        this.page = Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
        this.limit =
            Number.isInteger(limit) && limit > 0
                ? Math.min(limit, this.options.maxLimit)
                : this.options.defaultLimit;
        this.query = this.query.skip((this.page - 1) * this.limit).limit(this.limit);
        return this;
    }
}

module.exports = APIFeatures;
