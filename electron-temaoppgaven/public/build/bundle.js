
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* node_modules/svelte-eva-icons/src/icons/ChevronLeftIcon.svelte generated by Svelte v3.19.1 */

    const file = "node_modules/svelte-eva-icons/src/icons/ChevronLeftIcon.svelte";

    function create_fragment(ctx) {
    	let svg;
    	let g1;
    	let g0;
    	let rect;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			rect = svg_element("rect");
    			path = svg_element("path");
    			attr_dev(rect, "width", "24");
    			attr_dev(rect, "height", "24");
    			attr_dev(rect, "transform", "rotate(90 12 12)");
    			attr_dev(rect, "opacity", "0");
    			add_location(rect, file, 0, 138, 138);
    			attr_dev(path, "d", "M13.36 17a1 1 0 0 1-.72-.31l-3.86-4a1 1 0 0 1 0-1.4l4-4a1 1 0 1 1 1.42 1.42L10.9 12l3.18 3.3a1 1 0 0 1 0 1.41 1 1 0 0 1-.72.29z");
    			add_location(path, file, 0, 209, 209);
    			attr_dev(g0, "data-name", "chevron-left");
    			add_location(g0, file, 0, 110, 110);
    			attr_dev(g1, "data-name", "Layer 2");
    			add_location(g1, file, 0, 87, 87);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			append_dev(g0, rect);
    			append_dev(g0, path);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class ChevronLeftIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChevronLeftIcon",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* node_modules/svelte-eva-icons/src/icons/CloseSquareOutlineIcon.svelte generated by Svelte v3.19.1 */

    const file$1 = "node_modules/svelte-eva-icons/src/icons/CloseSquareOutlineIcon.svelte";

    function create_fragment$1(ctx) {
    	let svg;
    	let g1;
    	let g0;
    	let rect;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			rect = svg_element("rect");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(rect, "width", "24");
    			attr_dev(rect, "height", "24");
    			attr_dev(rect, "opacity", "0");
    			add_location(rect, file$1, 0, 138, 138);
    			attr_dev(path0, "d", "M18 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zm1 15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1z");
    			add_location(path0, file$1, 0, 180, 180);
    			attr_dev(path1, "d", "M14.71 9.29a1 1 0 0 0-1.42 0L12 10.59l-1.29-1.3a1 1 0 0 0-1.42 1.42l1.3 1.29-1.3 1.29a1 1 0 0 0 0 1.42 1 1 0 0 0 1.42 0l1.29-1.3 1.29 1.3a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42L13.41 12l1.3-1.29a1 1 0 0 0 0-1.42z");
    			add_location(path1, file$1, 0, 333, 333);
    			attr_dev(g0, "data-name", "close-square");
    			add_location(g0, file$1, 0, 110, 110);
    			attr_dev(g1, "data-name", "Layer 2");
    			add_location(g1, file$1, 0, 87, 87);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			append_dev(g0, rect);
    			append_dev(g0, path0);
    			append_dev(g0, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class CloseSquareOutlineIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CloseSquareOutlineIcon",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.19.1 */
    const file$2 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (34:1) {#if step=='choose'}
    function create_if_block_6(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div2;
    	let div1;
    	let h1;
    	let t2;
    	let button;
    	let button_intro;
    	let t4;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let dispose;
    	let if_block = !/*showFav*/ ctx[6] && create_if_block_7(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Got some intrusive thoughts you want to let go?";
    			t2 = space();
    			button = element("button");
    			button.textContent = "Let go";
    			t4 = space();
    			img1 = element("img");
    			t5 = space();
    			if (if_block) if_block.c();
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-fmmq8q");
    			add_location(img0, file$2, 34, 19, 709);
    			attr_dev(div0, "class", "logo svelte-fmmq8q");
    			add_location(div0, file$2, 34, 1, 691);
    			attr_dev(h1, "class", "h1-start svelte-fmmq8q");
    			add_location(h1, file$2, 37, 3, 812);
    			attr_dev(button, "class", "btn-start svelte-fmmq8q");
    			add_location(button, file$2, 38, 3, 889);
    			attr_dev(img1, "class", "img-letgo svelte-fmmq8q");
    			if (img1.src !== (img1_src_value = "./assets/dandelion.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Let Go Picture");
    			add_location(img1, file$2, 39, 3, 975);
    			attr_dev(div1, "class", "letgo svelte-fmmq8q");
    			add_location(div1, file$2, 36, 2, 789);
    			attr_dev(div2, "class", "choose svelte-fmmq8q");
    			add_location(div2, file$2, 35, 1, 766);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t2);
    			append_dev(div1, button);
    			append_dev(div1, t4);
    			append_dev(div1, img1);
    			append_dev(div2, t5);
    			if (if_block) if_block.m(div2, null);
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*showFav*/ ctx[6]) if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (!button_intro) {
    				add_render_callback(() => {
    					button_intro = create_in_transition(button, fade, {});
    					button_intro.start();
    				});
    			}

    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(34:1) {#if step=='choose'}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {#if !showFav}
    function create_if_block_7(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let button;
    	let button_intro;
    	let t3;
    	let t4;
    	let img;
    	let img_src_value;
    	let dispose;
    	let if_block = /*thoughts*/ ctx[3].length > 0 && create_if_block_8(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Got some positive thoughts you want to keep?";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Keep";
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			img = element("img");
    			attr_dev(h1, "class", "h1-start svelte-fmmq8q");
    			add_location(h1, file$2, 44, 4, 1103);
    			attr_dev(button, "class", "btn-start svelte-fmmq8q");
    			add_location(button, file$2, 45, 4, 1178);
    			attr_dev(img, "class", "img-keep svelte-fmmq8q");
    			if (img.src !== (img_src_value = "./assets/keep.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Keep Picture");
    			add_location(img, file$2, 49, 4, 1379);
    			attr_dev(div, "class", "keep svelte-fmmq8q");
    			add_location(div, file$2, 43, 3, 1080);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(div, t3);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t4);
    			append_dev(div, img);
    			dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[8], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (/*thoughts*/ ctx[3].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_8(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, t4);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (!button_intro) {
    				add_render_callback(() => {
    					button_intro = create_in_transition(button, fade, {});
    					button_intro.start();
    				});
    			}

    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(43:2) {#if !showFav}",
    		ctx
    	});

    	return block;
    }

    // (47:3) {#if thoughts.length > 0}
    function create_if_block_8(ctx) {
    	let button;
    	let button_intro;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Kept";
    			attr_dev(button, "class", "btn-start svelte-fmmq8q");
    			add_location(button, file$2, 47, 4, 1291);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[9], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (!button_intro) {
    				add_render_callback(() => {
    					button_intro = create_in_transition(button, fade, {});
    					button_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(47:3) {#if thoughts.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (58:1) {#if step=='writeletgo'}
    function create_if_block_5(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let h1;
    	let t2;
    	let textarea;
    	let t3;
    	let button;
    	let current;
    	let dispose;
    	const chevronlefticon = new ChevronLeftIcon({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(chevronlefticon.$$.fragment);
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Recognize your thoughts and write them down";
    			t2 = space();
    			textarea = element("textarea");
    			t3 = space();
    			button = element("button");
    			button.textContent = "I have recognised my thoughts";
    			attr_dev(div0, "class", "back svelte-fmmq8q");
    			add_location(div0, file$2, 60, 3, 1629);
    			attr_dev(h1, "class", "h1-write svelte-fmmq8q");
    			add_location(h1, file$2, 61, 3, 1729);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", "Write down your thoughts...");
    			attr_dev(textarea, "class", "svelte-fmmq8q");
    			add_location(textarea, file$2, 62, 3, 1802);
    			attr_dev(button, "class", "btn-accept svelte-fmmq8q");
    			add_location(button, file$2, 63, 3, 1905);
    			attr_dev(div1, "class", "writeletgo svelte-fmmq8q");
    			add_location(div1, file$2, 59, 2, 1601);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(chevronlefticon, div0, null);
    			append_dev(div1, t0);
    			append_dev(div1, h1);
    			append_dev(div1, t2);
    			append_dev(div1, textarea);
    			set_input_value(textarea, /*letgothought*/ ctx[1]);
    			append_dev(div1, t3);
    			append_dev(div1, button);
    			current = true;

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_3*/ ctx[10], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[11]),
    				listen_dev(button, "click", /*click_handler_4*/ ctx[12], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 2) {
    				set_input_value(textarea, /*letgothought*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chevronlefticon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chevronlefticon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(chevronlefticon);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(58:1) {#if step=='writeletgo'}",
    		ctx
    	});

    	return block;
    }

    // (67:1) {#if step=='acceptletgo'}
    function create_if_block_4(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let p0;
    	let q;
    	let t1;
    	let p0_intro;
    	let t2;
    	let div2;
    	let h1;
    	let t4;
    	let p1;
    	let t6;
    	let p2;
    	let t8;
    	let p3;
    	let t10;
    	let button;
    	let current;
    	let dispose;
    	const chevronlefticon = new ChevronLeftIcon({ $$inline: true });

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			create_component(chevronlefticon.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			p0 = element("p");
    			q = element("q");
    			t1 = text(/*letgothought*/ ctx[1]);
    			t2 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Accept & Let go";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Accept the thoughts and feelings you have.";
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "Do not give the thoughts too much room, just enough attention and accept that they exist.";
    			t8 = space();
    			p3 = element("p");
    			p3.textContent = "But leave them alone.";
    			t10 = space();
    			button = element("button");
    			button.textContent = "Accept & Let go";
    			attr_dev(div0, "class", "back svelte-fmmq8q");
    			add_location(div0, file$2, 68, 4, 2124);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-fmmq8q");
    			add_location(q, file$2, 70, 35, 2273);
    			attr_dev(p0, "class", "acceptText svelte-fmmq8q");
    			add_location(p0, file$2, 70, 5, 2243);
    			attr_dev(div1, "class", "acceptGuidance svelte-fmmq8q");
    			add_location(div1, file$2, 69, 4, 2209);
    			attr_dev(h1, "class", "h1-write svelte-fmmq8q");
    			add_location(h1, file$2, 73, 5, 2355);
    			attr_dev(p1, "class", "svelte-fmmq8q");
    			add_location(p1, file$2, 74, 5, 2402);
    			attr_dev(p2, "class", "svelte-fmmq8q");
    			add_location(p2, file$2, 75, 5, 2457);
    			attr_dev(p3, "class", "svelte-fmmq8q");
    			add_location(p3, file$2, 77, 5, 2565);
    			attr_dev(button, "class", "svelte-fmmq8q");
    			add_location(button, file$2, 79, 5, 2606);
    			attr_dev(div2, "class", "acceptGuidance svelte-fmmq8q");
    			add_location(div2, file$2, 72, 4, 2321);
    			attr_dev(div3, "class", "acceptletgo svelte-fmmq8q");
    			set_style(div3, "background-image", "url('" + bgAccept + "')");
    			add_location(div3, file$2, 67, 2, 2050);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			mount_component(chevronlefticon, div0, null);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, p0);
    			append_dev(p0, q);
    			append_dev(q, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t4);
    			append_dev(div2, p1);
    			append_dev(div2, t6);
    			append_dev(div2, p2);
    			append_dev(div2, t8);
    			append_dev(div2, p3);
    			append_dev(div2, t10);
    			append_dev(div2, button);
    			current = true;

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_5*/ ctx[13], false, false, false),
    				listen_dev(button, "click", /*click_handler_6*/ ctx[14], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*letgothought*/ 2) set_data_dev(t1, /*letgothought*/ ctx[1]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chevronlefticon.$$.fragment, local);

    			if (!p0_intro) {
    				add_render_callback(() => {
    					p0_intro = create_in_transition(p0, fade, {});
    					p0_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chevronlefticon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(chevronlefticon);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(67:1) {#if step=='acceptletgo'}",
    		ctx
    	});

    	return block;
    }

    // (84:1) {#if step=='intospace'}
    function create_if_block_3(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let h1;
    	let t2;
    	let button;
    	let current;
    	let dispose;
    	const chevronlefticon = new ChevronLeftIcon({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(chevronlefticon.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Your thoughts are flown into space";
    			t2 = space();
    			button = element("button");
    			button.textContent = "Back to home";
    			attr_dev(div0, "class", "back svelte-fmmq8q");
    			add_location(div0, file$2, 84, 3, 2751);
    			attr_dev(h1, "class", "svelte-fmmq8q");
    			add_location(h1, file$2, 86, 4, 2922);
    			attr_dev(button, "class", "svelte-fmmq8q");
    			add_location(button, file$2, 87, 4, 2970);
    			attr_dev(div1, "class", "intospace svelte-fmmq8q");
    			set_style(div1, "background-image", "url('" + bgSpace + "')");
    			add_location(div1, file$2, 85, 3, 2851);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(chevronlefticon, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t2);
    			append_dev(div1, button);
    			current = true;

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_7*/ ctx[15], false, false, false),
    				listen_dev(button, "click", /*click_handler_8*/ ctx[16], false, false, false)
    			];
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chevronlefticon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chevronlefticon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(chevronlefticon);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(84:1) {#if step=='intospace'}",
    		ctx
    	});

    	return block;
    }

    // (100:1) {#if step=='writekeep'}
    function create_if_block_2(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let h1;
    	let t2;
    	let textarea;
    	let t3;
    	let button;
    	let current;
    	let dispose;
    	const chevronlefticon = new ChevronLeftIcon({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(chevronlefticon.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Write a positive thought or feedback you have received. For example: “What would your friends say about you?”";
    			t2 = space();
    			textarea = element("textarea");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Keep thoughts";
    			attr_dev(div0, "class", "back svelte-fmmq8q");
    			add_location(div0, file$2, 100, 2, 3098);
    			attr_dev(h1, "class", "h1-write svelte-fmmq8q");
    			add_location(h1, file$2, 102, 3, 3225);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", "Write something positive about yourself...");
    			attr_dev(textarea, "class", "svelte-fmmq8q");
    			add_location(textarea, file$2, 103, 3, 3364);
    			attr_dev(button, "class", "svelte-fmmq8q");
    			add_location(button, file$2, 104, 3, 3482);
    			attr_dev(div1, "class", "writekeep svelte-fmmq8q");
    			add_location(div1, file$2, 101, 2, 3196);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(chevronlefticon, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t2);
    			append_dev(div1, textarea);
    			set_input_value(textarea, /*keepthought*/ ctx[2]);
    			append_dev(div1, t3);
    			append_dev(div1, button);
    			current = true;

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_9*/ ctx[17], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[18]),
    				listen_dev(button, "click", /*click_handler_10*/ ctx[19], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 4) {
    				set_input_value(textarea, /*keepthought*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chevronlefticon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chevronlefticon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(chevronlefticon);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(100:1) {#if step=='writekeep'}",
    		ctx
    	});

    	return block;
    }

    // (109:1) {#if step=='acceptkeep'}
    function create_if_block_1(ctx) {
    	let div0;
    	let t0;
    	let div3;
    	let div1;
    	let p0;
    	let q;
    	let t1;
    	let t2;
    	let div2;
    	let h1;
    	let t4;
    	let p1;
    	let t6;
    	let button0;
    	let t8;
    	let button1;
    	let current;
    	let dispose;
    	const chevronlefticon = new ChevronLeftIcon({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(chevronlefticon.$$.fragment);
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			p0 = element("p");
    			q = element("q");
    			t1 = text(/*keepthought*/ ctx[2]);
    			t2 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Kept it!";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Your positive thoughts/feedback are kept for future review. They can provide you warm feelings for good and bad days.";
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "Keep more positive thoughts";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "See kept thoughts";
    			attr_dev(div0, "class", "back svelte-fmmq8q");
    			add_location(div0, file$2, 109, 2, 3614);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-fmmq8q");
    			add_location(q, file$2, 112, 27, 3781);
    			attr_dev(p0, "class", "acceptText svelte-fmmq8q");
    			add_location(p0, file$2, 112, 5, 3759);
    			attr_dev(div1, "class", "acceptGuidance svelte-fmmq8q");
    			add_location(div1, file$2, 111, 3, 3725);
    			attr_dev(h1, "class", "h1-write svelte-fmmq8q");
    			add_location(h1, file$2, 115, 5, 3860);
    			attr_dev(p1, "class", "svelte-fmmq8q");
    			add_location(p1, file$2, 116, 5, 3900);
    			attr_dev(button0, "class", "svelte-fmmq8q");
    			add_location(button0, file$2, 117, 5, 4030);
    			attr_dev(button1, "class", "svelte-fmmq8q");
    			add_location(button1, file$2, 118, 5, 4139);
    			attr_dev(div2, "class", "acceptGuidance svelte-fmmq8q");
    			add_location(div2, file$2, 114, 3, 3826);
    			attr_dev(div3, "class", "acceptkeep svelte-fmmq8q");
    			add_location(div3, file$2, 110, 2, 3697);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(chevronlefticon, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, p0);
    			append_dev(p0, q);
    			append_dev(q, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t4);
    			append_dev(div2, p1);
    			append_dev(div2, t6);
    			append_dev(div2, button0);
    			append_dev(div2, t8);
    			append_dev(div2, button1);
    			current = true;

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_11*/ ctx[20], false, false, false),
    				listen_dev(button0, "click", /*click_handler_12*/ ctx[21], false, false, false),
    				listen_dev(button1, "click", /*click_handler_13*/ ctx[22], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*keepthought*/ 4) set_data_dev(t1, /*keepthought*/ ctx[2]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chevronlefticon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chevronlefticon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(chevronlefticon);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(109:1) {#if step=='acceptkeep'}",
    		ctx
    	});

    	return block;
    }

    // (124:1) {#if step=='kept'}
    function create_if_block(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let h1;
    	let t2;
    	let t3;
    	let button;
    	let current;
    	let dispose;
    	const chevronlefticon = new ChevronLeftIcon({ $$inline: true });
    	let each_value = /*thoughts*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(chevronlefticon.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Kept thoughts";
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			button = element("button");
    			button.textContent = "Back to home";
    			attr_dev(div0, "class", "back svelte-fmmq8q");
    			add_location(div0, file$2, 124, 2, 4277);
    			attr_dev(h1, "class", "svelte-fmmq8q");
    			add_location(h1, file$2, 126, 3, 4425);
    			attr_dev(button, "class", "svelte-fmmq8q");
    			add_location(button, file$2, 137, 3, 4807);
    			attr_dev(div1, "class", "kept svelte-fmmq8q");
    			set_style(div1, "background-image", "url('" + bgKept + "')");
    			add_location(div1, file$2, 125, 2, 4361);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(chevronlefticon, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t3);
    			append_dev(div1, button);
    			current = true;

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_14*/ ctx[23], false, false, false),
    				listen_dev(button, "click", /*click_handler_16*/ ctx[25], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*removeThought, thoughts*/ 40) {
    				each_value = /*thoughts*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, t3);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chevronlefticon.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chevronlefticon.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(chevronlefticon);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(124:1) {#if step=='kept'}",
    		ctx
    	});

    	return block;
    }

    // (128:3) {#each thoughts as thought, index}
    function create_each_block(ctx) {
    	let div2;
    	let div1;
    	let p;
    	let q;
    	let t0_value = /*thought*/ ctx[26] + "";
    	let t0;
    	let p_intro;
    	let p_outro;
    	let t1;
    	let div0;
    	let div0_outro;
    	let current;
    	let dispose;
    	const closesquareoutlineicon = new CloseSquareOutlineIcon({ $$inline: true });

    	function click_handler_15(...args) {
    		return /*click_handler_15*/ ctx[24](/*index*/ ctx[28], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			p = element("p");
    			q = element("q");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			create_component(closesquareoutlineicon.$$.fragment);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-fmmq8q");
    			add_location(q, file$2, 130, 53, 4608);
    			attr_dev(p, "class", "keptThoughts-text svelte-fmmq8q");
    			add_location(p, file$2, 130, 6, 4561);
    			attr_dev(div0, "class", "close svelte-fmmq8q");
    			attr_dev(div0, "hover:red", "");
    			add_location(div0, file$2, 131, 6, 4644);
    			attr_dev(div1, "class", "keptThoughts-item1 svelte-fmmq8q");
    			add_location(div1, file$2, 129, 5, 4522);
    			attr_dev(div2, "class", "keptThoughts svelte-fmmq8q");
    			add_location(div2, file$2, 128, 4, 4490);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, q);
    			append_dev(q, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(closesquareoutlineicon, div0, null);
    			current = true;
    			dispose = listen_dev(div0, "click", click_handler_15, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*thoughts*/ 8) && t0_value !== (t0_value = /*thought*/ ctx[26] + "")) set_data_dev(t0, t0_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (p_outro) p_outro.end(1);
    				if (!p_intro) p_intro = create_in_transition(p, fade, {});
    				p_intro.start();
    			});

    			transition_in(closesquareoutlineicon.$$.fragment, local);
    			if (div0_outro) div0_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			if (p_intro) p_intro.invalidate();
    			p_outro = create_out_transition(p, fade, {});
    			transition_out(closesquareoutlineicon.$$.fragment, local);
    			div0_outro = create_out_transition(div0, fade, {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching && p_outro) p_outro.end();
    			destroy_component(closesquareoutlineicon);
    			if (detaching && div0_outro) div0_outro.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(128:3) {#each thoughts as thought, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let body;
    	let main;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let current;
    	let if_block0 = /*step*/ ctx[0] == "choose" && create_if_block_6(ctx);
    	let if_block1 = /*step*/ ctx[0] == "writeletgo" && create_if_block_5(ctx);
    	let if_block2 = /*step*/ ctx[0] == "acceptletgo" && create_if_block_4(ctx);
    	let if_block3 = /*step*/ ctx[0] == "intospace" && create_if_block_3(ctx);
    	let if_block4 = /*step*/ ctx[0] == "writekeep" && create_if_block_2(ctx);
    	let if_block5 = /*step*/ ctx[0] == "acceptkeep" && create_if_block_1(ctx);
    	let if_block6 = /*step*/ ctx[0] == "kept" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			body = element("body");
    			main = element("main");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			t5 = space();
    			if (if_block6) if_block6.c();
    			attr_dev(main, "class", "svelte-fmmq8q");
    			add_location(main, file$2, 32, 0, 661);
    			attr_dev(body, "class", "svelte-fmmq8q");
    			add_location(body, file$2, 31, 0, 654);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			append_dev(body, main);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t0);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t1);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t2);
    			if (if_block3) if_block3.m(main, null);
    			append_dev(main, t3);
    			if (if_block4) if_block4.m(main, null);
    			append_dev(main, t4);
    			if (if_block5) if_block5.m(main, null);
    			append_dev(main, t5);
    			if (if_block6) if_block6.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*step*/ ctx[0] == "choose") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(main, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*step*/ ctx[0] == "writeletgo") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*step*/ ctx[0] == "acceptletgo") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*step*/ ctx[0] == "intospace") {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    					transition_in(if_block3, 1);
    				} else {
    					if_block3 = create_if_block_3(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(main, t3);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (/*step*/ ctx[0] == "writekeep") {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    					transition_in(if_block4, 1);
    				} else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(main, t4);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			if (/*step*/ ctx[0] == "acceptkeep") {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    					transition_in(if_block5, 1);
    				} else {
    					if_block5 = create_if_block_1(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(main, t5);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}

    			if (/*step*/ ctx[0] == "kept") {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    					transition_in(if_block6, 1);
    				} else {
    					if_block6 = create_if_block(ctx);
    					if_block6.c();
    					transition_in(if_block6, 1);
    					if_block6.m(main, null);
    				}
    			} else if (if_block6) {
    				group_outros();

    				transition_out(if_block6, 1, 1, () => {
    					if_block6 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			transition_in(if_block5);
    			transition_in(if_block6);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			transition_out(if_block5);
    			transition_out(if_block6);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const bgAccept = "./assets/acceptletgo.png";
    const bgSpace = "./assets/space.jpg";
    const bgKept = "./assets/kept.png";

    function instance($$self, $$props, $$invalidate) {
    	let step = "choose";
    	let letgothought;
    	let keepthought;
    	let thoughts = [];

    	let addThoughts = () => {
    		$$invalidate(3, thoughts = [keepthought, ...thoughts]);
    	};

    	let removeThought = index => {
    		thoughts.splice(index, 1);
    		$$invalidate(3, thoughts);
    	};

    	let showFav;
    	const click_handler = () => $$invalidate(0, step = "writeletgo");
    	const click_handler_1 = () => $$invalidate(0, step = "writekeep");
    	const click_handler_2 = () => $$invalidate(0, step = "kept");

    	const click_handler_3 = () => {
    		$$invalidate(0, step = "choose");
    		$$invalidate(1, letgothought = "");
    	};

    	function textarea_input_handler() {
    		letgothought = this.value;
    		$$invalidate(1, letgothought);
    	}

    	const click_handler_4 = () => $$invalidate(0, step = "acceptletgo");

    	const click_handler_5 = () => {
    		$$invalidate(0, step = "writeletgo");
    	};

    	const click_handler_6 = () => {
    		$$invalidate(0, step = "intospace");
    		$$invalidate(1, letgothought = "");
    	};

    	const click_handler_7 = () => {
    		$$invalidate(0, step = "choose");
    		$$invalidate(1, letgothought = "");
    	};

    	const click_handler_8 = () => $$invalidate(0, step = "choose");

    	const click_handler_9 = () => {
    		$$invalidate(0, step = "choose");
    		$$invalidate(2, keepthought = "");
    	};

    	function textarea_input_handler_1() {
    		keepthought = this.value;
    		$$invalidate(2, keepthought);
    	}

    	const click_handler_10 = () => {
    		$$invalidate(0, step = "acceptkeep");
    		addThoughts();
    	};

    	const click_handler_11 = () => {
    		$$invalidate(0, step = "writekeep");
    	};

    	const click_handler_12 = () => {
    		$$invalidate(0, step = "writekeep");
    		$$invalidate(2, keepthought = "");
    	};

    	const click_handler_13 = () => {
    		$$invalidate(0, step = "kept");
    		$$invalidate(2, keepthought = "");
    	};

    	const click_handler_14 = () => {
    		$$invalidate(0, step = "acceptkeep");
    	};

    	const click_handler_15 = index => removeThought(index);

    	const click_handler_16 = () => {
    		$$invalidate(0, step = "choose");
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		fly,
    		scale,
    		CloseSquareOutlineIcon,
    		ChevronLeftIcon,
    		step,
    		letgothought,
    		keepthought,
    		thoughts,
    		addThoughts,
    		removeThought,
    		bgAccept,
    		bgSpace,
    		bgKept,
    		showFav
    	});

    	$$self.$inject_state = $$props => {
    		if ("step" in $$props) $$invalidate(0, step = $$props.step);
    		if ("letgothought" in $$props) $$invalidate(1, letgothought = $$props.letgothought);
    		if ("keepthought" in $$props) $$invalidate(2, keepthought = $$props.keepthought);
    		if ("thoughts" in $$props) $$invalidate(3, thoughts = $$props.thoughts);
    		if ("addThoughts" in $$props) $$invalidate(4, addThoughts = $$props.addThoughts);
    		if ("removeThought" in $$props) $$invalidate(5, removeThought = $$props.removeThought);
    		if ("showFav" in $$props) $$invalidate(6, showFav = $$props.showFav);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		step,
    		letgothought,
    		keepthought,
    		thoughts,
    		addThoughts,
    		removeThought,
    		showFav,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		textarea_input_handler,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		textarea_input_handler_1,
    		click_handler_10,
    		click_handler_11,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14,
    		click_handler_15,
    		click_handler_16
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
