export interface Compare {
    <T>(func?: BaseComparator<T>): Comparator<T>;
    on<T>(transformOrProperty: ((a: T) => any) | keyof T): Comparator<T>;
    locale(locales?: string | string[], options?: Intl.CollatorOptions): Comparator<string>;
}

export type BaseComparator<T> = (a: T, b: T) => number;

export interface Comparator<T> extends BaseComparator<T> {
    reverse(): Comparator<T>;
    map<U>(transform: (a: U) => T): Comparator<U>;
    append<U>(predicate: (a: T | U) => a is U, handler?: BaseComparator<U>): Comparator<T | U>;
    append(predicate: (a: T) => boolean, handler?: BaseComparator<T>): Comparator<T>;
    prepend<U>(predicate: (a: U | T) => a is U, handler?: BaseComparator<U>): Comparator<U | T>;
    prepend(predicate: (a: T) => boolean, handler?: BaseComparator<T>): Comparator<T>;
    then<U>(handler?: BaseComparator<U>): Comparator<T & U>;
}

function defaultComparator<T>(a: T, b: T): number {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

function reverse<T>(this: BaseComparator<T>): Comparator<T> {
    return compare((a, b) => this(b, a));
}

function map<T, U>(this: BaseComparator<T>, transform: (a: U) => T): Comparator<U> {
    return compare((a, b) => this(transform(a), transform(b)));
}

function append<T, U>(
    this: BaseComparator<T>,
    predicate: (a: T | U) => a is U,
    handler: BaseComparator<U> = defaultComparator,
): Comparator<T | U> {
    return compare((a, b) => {
        if (predicate(a)) {
            if (predicate(b)) {
                return handler(a, b);
            } else {
                return 1;
            }
        } else {
            if (predicate(b)) {
                return -1;
            } else {
                return this(a, b);
            }
        }
    });
}

function prepend<T, U>(
    this: BaseComparator<T>,
    predicate: (a: U | T) => a is U,
    handler: BaseComparator<U> = defaultComparator,
): Comparator<T> {
    return compare((a, b) => {
        if (predicate(a)) {
            if (predicate(b)) {
                return handler(a, b);
            } else {
                return -1;
            }
        } else {
            if (predicate(b)) {
                return 1;
            } else {
                return this(a, b);
            }
        }
    });
}

function then<T, U>(
    this: BaseComparator<T>,
    handler: BaseComparator<U> = defaultComparator,
): Comparator<T & U> {
    return compare((a, b) => {
        return this(a, b) || handler(a, b);
    });
}

const compare: Compare = (<T> (func: BaseComparator<T> = defaultComparator): Comparator<T> => {
    const result = func as any;
    result.reverse = reverse;
    result.map = map;
    result.append = append;
    result.prepend = prepend;
    result.then = then;
    return result;
}) as Compare;

compare.on = function on<T>(transformOrProperty: ((a: T) => any) | keyof T): Comparator<T> {
    if (typeof transformOrProperty === 'function') {
        return this<any>().map(transformOrProperty as (a: T) => any);
    }
    return this<T[keyof T]>().map((a) => a[transformOrProperty]);
};

compare.locale = function locale(locales?: string | string[], options?: Intl.CollatorOptions): Comparator<string> {
    return compare(new Intl.Collator(locales, options).compare);
};

export default compare;