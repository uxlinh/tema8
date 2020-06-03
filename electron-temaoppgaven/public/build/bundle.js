
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
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

    /* src/App.svelte generated by Svelte v3.19.1 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (32:1) {#if step=='choose'}
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
    			attr_dev(img0, "class", "svelte-e0or1i");
    			add_location(img0, file, 32, 19, 598);
    			attr_dev(div0, "class", "logo svelte-e0or1i");
    			add_location(div0, file, 32, 1, 580);
    			attr_dev(h1, "class", "h1-start svelte-e0or1i");
    			add_location(h1, file, 35, 3, 701);
    			attr_dev(button, "class", "btn-start svelte-e0or1i");
    			add_location(button, file, 36, 3, 778);
    			attr_dev(img1, "class", "img-letgo svelte-e0or1i");
    			if (img1.src !== (img1_src_value = "./assets/dandelion.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Let Go Picture");
    			add_location(img1, file, 37, 3, 856);
    			attr_dev(div1, "class", "letgo svelte-e0or1i");
    			add_location(div1, file, 34, 2, 678);
    			attr_dev(div2, "class", "choose svelte-e0or1i");
    			add_location(div2, file, 33, 1, 655);
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
    		source: "(32:1) {#if step=='choose'}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if !showFav}
    function create_if_block_7(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let button;
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
    			attr_dev(h1, "class", "h1-start svelte-e0or1i");
    			add_location(h1, file, 42, 4, 984);
    			attr_dev(button, "class", "btn-start svelte-e0or1i");
    			add_location(button, file, 43, 4, 1059);
    			attr_dev(img, "class", "img-keep svelte-e0or1i");
    			if (img.src !== (img_src_value = "./assets/keep.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Keep Picture");
    			add_location(img, file, 47, 4, 1252);
    			attr_dev(div, "class", "keep svelte-e0or1i");
    			add_location(div, file, 41, 3, 961);
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
    		source: "(41:2) {#if !showFav}",
    		ctx
    	});

    	return block;
    }

    // (45:3) {#if thoughts.length > 0}
    function create_if_block_8(ctx) {
    	let button;
    	let button_intro;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Kept";
    			attr_dev(button, "class", "btn-start svelte-e0or1i");
    			add_location(button, file, 45, 4, 1164);
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
    		source: "(45:3) {#if thoughts.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (56:1) {#if step=='writeletgo'}
    function create_if_block_5(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div2;
    	let h1;
    	let t3;
    	let textarea;
    	let t4;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Recognize your thoughts and write them down";
    			t3 = space();
    			textarea = element("textarea");
    			t4 = space();
    			button = element("button");
    			button.textContent = "I have recognised my thoughts";
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-e0or1i");
    			add_location(img0, file, 56, 20, 1415);
    			attr_dev(div0, "class", "logo svelte-e0or1i");
    			add_location(div0, file, 56, 2, 1397);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-e0or1i");
    			add_location(img1, file, 57, 74, 1544);
    			attr_dev(div1, "class", "back svelte-e0or1i");
    			add_location(div1, file, 57, 2, 1472);
    			attr_dev(h1, "class", "h1-write svelte-e0or1i");
    			add_location(h1, file, 59, 3, 1627);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", "Write down your thoughts...");
    			attr_dev(textarea, "class", "svelte-e0or1i");
    			add_location(textarea, file, 60, 3, 1700);
    			attr_dev(button, "class", "svelte-e0or1i");
    			add_location(button, file, 61, 3, 1803);
    			attr_dev(div2, "class", "writeletgo svelte-e0or1i");
    			add_location(div2, file, 58, 2, 1599);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t3);
    			append_dev(div2, textarea);
    			set_input_value(textarea, /*letgothought*/ ctx[1]);
    			append_dev(div2, t4);
    			append_dev(div2, button);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_3*/ ctx[10], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[11]),
    				listen_dev(button, "click", /*click_handler_4*/ ctx[12], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 2) {
    				set_input_value(textarea, /*letgothought*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(56:1) {#if step=='writeletgo'}",
    		ctx
    	});

    	return block;
    }

    // (65:1) {#if step=='acceptletgo'}
    function create_if_block_4(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div4;
    	let div2;
    	let p0;
    	let q;
    	let t2;
    	let t3;
    	let div3;
    	let h1;
    	let t5;
    	let p1;
    	let t7;
    	let p2;
    	let t9;
    	let p3;
    	let t11;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div4 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			q = element("q");
    			t2 = text(/*letgothought*/ ctx[1]);
    			t3 = space();
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Accept & Let go";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Accept the thoughts and feelings you have.";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "Do not give the thoughts too much room, just enough attention and accept that they exist.";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "But leave them alone.";
    			t11 = space();
    			button = element("button");
    			button.textContent = "Accept & Let go";
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-e0or1i");
    			add_location(img0, file, 65, 20, 1947);
    			attr_dev(div0, "class", "logo svelte-e0or1i");
    			add_location(div0, file, 65, 2, 1929);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-e0or1i");
    			add_location(img1, file, 66, 78, 2080);
    			attr_dev(div1, "class", "back svelte-e0or1i");
    			add_location(div1, file, 66, 2, 2004);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-e0or1i");
    			add_location(q, file, 69, 27, 2265);
    			attr_dev(p0, "class", "acceptText svelte-e0or1i");
    			add_location(p0, file, 69, 5, 2243);
    			attr_dev(div2, "class", "acceptGuidance svelte-e0or1i");
    			add_location(div2, file, 68, 4, 2209);
    			attr_dev(h1, "class", "h1-write svelte-e0or1i");
    			add_location(h1, file, 72, 5, 2347);
    			attr_dev(p1, "class", "svelte-e0or1i");
    			add_location(p1, file, 73, 5, 2394);
    			attr_dev(p2, "class", "svelte-e0or1i");
    			add_location(p2, file, 74, 5, 2449);
    			attr_dev(p3, "class", "svelte-e0or1i");
    			add_location(p3, file, 76, 5, 2557);
    			attr_dev(button, "class", "svelte-e0or1i");
    			add_location(button, file, 78, 5, 2598);
    			attr_dev(div3, "class", "acceptGuidance svelte-e0or1i");
    			add_location(div3, file, 71, 4, 2313);
    			attr_dev(div4, "class", "acceptletgo svelte-e0or1i");
    			set_style(div4, "background-image", "url('" + bgAccept + "')");
    			add_location(div4, file, 67, 2, 2135);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, p0);
    			append_dev(p0, q);
    			append_dev(q, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, h1);
    			append_dev(div3, t5);
    			append_dev(div3, p1);
    			append_dev(div3, t7);
    			append_dev(div3, p2);
    			append_dev(div3, t9);
    			append_dev(div3, p3);
    			append_dev(div3, t11);
    			append_dev(div3, button);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_5*/ ctx[13], false, false, false),
    				listen_dev(button, "click", /*click_handler_6*/ ctx[14], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 2) set_data_dev(t2, /*letgothought*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div4);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(65:1) {#if step=='acceptletgo'}",
    		ctx
    	});

    	return block;
    }

    // (83:1) {#if step=='intospace'}
    function create_if_block_3(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div2;
    	let h1;
    	let t3;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Your thoughts are flown into space";
    			t3 = space();
    			button = element("button");
    			button.textContent = "Back to home";
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-e0or1i");
    			add_location(img0, file, 83, 20, 2760);
    			attr_dev(div0, "class", "logo svelte-e0or1i");
    			add_location(div0, file, 83, 2, 2742);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-e0or1i");
    			add_location(img1, file, 85, 74, 2890);
    			attr_dev(div1, "class", "back svelte-e0or1i");
    			add_location(div1, file, 85, 2, 2818);
    			attr_dev(h1, "class", "svelte-e0or1i");
    			add_location(h1, file, 89, 4, 3020);
    			attr_dev(button, "class", "svelte-e0or1i");
    			add_location(button, file, 90, 4, 3068);
    			attr_dev(div2, "class", "intospace svelte-e0or1i");
    			set_style(div2, "background-image", "url('" + bgSpace + "')");
    			add_location(div2, file, 88, 3, 2949);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t3);
    			append_dev(div2, button);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_7*/ ctx[15], false, false, false),
    				listen_dev(button, "click", /*click_handler_8*/ ctx[16], false, false, false)
    			];
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(83:1) {#if step=='intospace'}",
    		ctx
    	});

    	return block;
    }

    // (103:1) {#if step=='writekeep'}
    function create_if_block_2(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div2;
    	let h1;
    	let t3;
    	let textarea;
    	let t4;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Write a positive thought or feedback you have received. For example: “What would your friends say about you?”";
    			t3 = space();
    			textarea = element("textarea");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Keep thoughts";
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-e0or1i");
    			add_location(img0, file, 103, 20, 3214);
    			attr_dev(div0, "class", "logo svelte-e0or1i");
    			add_location(div0, file, 103, 2, 3196);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-e0or1i");
    			add_location(img1, file, 104, 72, 3341);
    			attr_dev(div1, "class", "back svelte-e0or1i");
    			add_location(div1, file, 104, 2, 3271);
    			attr_dev(h1, "class", "h1-write svelte-e0or1i");
    			add_location(h1, file, 106, 3, 3425);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "class", "svelte-e0or1i");
    			add_location(textarea, file, 107, 3, 3564);
    			attr_dev(button, "class", "svelte-e0or1i");
    			add_location(button, file, 108, 3, 3625);
    			attr_dev(div2, "class", "writekeep svelte-e0or1i");
    			add_location(div2, file, 105, 2, 3396);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t3);
    			append_dev(div2, textarea);
    			set_input_value(textarea, /*keepthought*/ ctx[2]);
    			append_dev(div2, t4);
    			append_dev(div2, button);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_9*/ ctx[17], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[18]),
    				listen_dev(button, "click", /*click_handler_10*/ ctx[19], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 4) {
    				set_input_value(textarea, /*keepthought*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(103:1) {#if step=='writekeep'}",
    		ctx
    	});

    	return block;
    }

    // (113:1) {#if step=='acceptkeep'}
    function create_if_block_1(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div4;
    	let div2;
    	let p0;
    	let q;
    	let t2;
    	let t3;
    	let div3;
    	let h1;
    	let t5;
    	let p1;
    	let t7;
    	let button0;
    	let t9;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div4 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			q = element("q");
    			t2 = text(/*keepthought*/ ctx[2]);
    			t3 = space();
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Kept it!";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Your positive thoughts/feedback are kept for future review. They can provide you warm feelings for good and bad days.";
    			t7 = space();
    			button0 = element("button");
    			button0.textContent = "Keep more positive thoughts";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "See kept thoughts";
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-e0or1i");
    			add_location(img0, file, 113, 20, 3775);
    			attr_dev(div0, "class", "logo svelte-e0or1i");
    			add_location(div0, file, 113, 2, 3757);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-e0or1i");
    			add_location(img1, file, 114, 57, 3887);
    			attr_dev(div1, "class", "back svelte-e0or1i");
    			add_location(div1, file, 114, 2, 3832);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-e0or1i");
    			add_location(q, file, 117, 27, 4026);
    			attr_dev(p0, "class", "acceptText svelte-e0or1i");
    			add_location(p0, file, 117, 5, 4004);
    			attr_dev(div2, "class", "acceptGuidance svelte-e0or1i");
    			add_location(div2, file, 116, 3, 3970);
    			attr_dev(h1, "class", "h1-write svelte-e0or1i");
    			add_location(h1, file, 120, 5, 4105);
    			attr_dev(p1, "class", "svelte-e0or1i");
    			add_location(p1, file, 121, 5, 4145);
    			attr_dev(button0, "class", "svelte-e0or1i");
    			add_location(button0, file, 122, 5, 4275);
    			attr_dev(button1, "class", "svelte-e0or1i");
    			add_location(button1, file, 123, 5, 4384);
    			attr_dev(div3, "class", "acceptGuidance svelte-e0or1i");
    			add_location(div3, file, 119, 3, 4071);
    			attr_dev(div4, "class", "acceptkeep svelte-e0or1i");
    			add_location(div4, file, 115, 2, 3942);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, p0);
    			append_dev(p0, q);
    			append_dev(q, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, h1);
    			append_dev(div3, t5);
    			append_dev(div3, p1);
    			append_dev(div3, t7);
    			append_dev(div3, button0);
    			append_dev(div3, t9);
    			append_dev(div3, button1);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_11*/ ctx[20], false, false, false),
    				listen_dev(button0, "click", /*click_handler_12*/ ctx[21], false, false, false),
    				listen_dev(button1, "click", /*click_handler_13*/ ctx[22], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 4) set_data_dev(t2, /*keepthought*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div4);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(113:1) {#if step=='acceptkeep'}",
    		ctx
    	});

    	return block;
    }

    // (129:1) {#if step=='kept'}
    function create_if_block(ctx) {
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h1;
    	let t2;
    	let t3;
    	let button;
    	let dispose;
    	let each_value = /*thoughts*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img = element("img");
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
    			if (img.src !== (img_src_value = "./assets/back.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Arrow Back");
    			attr_dev(img, "class", "svelte-e0or1i");
    			add_location(img, file, 129, 58, 4578);
    			attr_dev(div0, "class", "back svelte-e0or1i");
    			add_location(div0, file, 129, 2, 4522);
    			attr_dev(h1, "class", "svelte-e0or1i");
    			add_location(h1, file, 131, 3, 4697);
    			attr_dev(button, "class", "svelte-e0or1i");
    			add_location(button, file, 139, 3, 5019);
    			attr_dev(div1, "class", "kept svelte-e0or1i");
    			set_style(div1, "background-image", "url('" + bgKept + "')");
    			add_location(div1, file, 130, 2, 4633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t3);
    			append_dev(div1, button);

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
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, t3);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
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
    		source: "(129:1) {#if step=='kept'}",
    		ctx
    	});

    	return block;
    }

    // (133:3) {#each thoughts as thought, index}
    function create_each_block(ctx) {
    	let div2;
    	let div0;
    	let p;
    	let q;
    	let t0_value = /*thought*/ ctx[26] + "";
    	let t0;
    	let t1;
    	let div1;
    	let span;
    	let dispose;

    	function click_handler_15(...args) {
    		return /*click_handler_15*/ ctx[24](/*index*/ ctx[28], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			p = element("p");
    			q = element("q");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			span = element("span");
    			span.textContent = "Remove";
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-e0or1i");
    			add_location(q, file, 134, 60, 4849);
    			attr_dev(p, "class", "acceptText svelte-e0or1i");
    			add_location(p, file, 134, 37, 4826);
    			attr_dev(div0, "class", "keptThoughts-item1 svelte-e0or1i");
    			add_location(div0, file, 134, 5, 4794);
    			attr_dev(span, "class", "svelte-e0or1i");
    			add_location(span, file, 135, 37, 4922);
    			attr_dev(div1, "class", "keptThoughts-item2 svelte-e0or1i");
    			add_location(div1, file, 135, 5, 4890);
    			attr_dev(div2, "class", "keptThoughts svelte-e0or1i");
    			add_location(div2, file, 133, 4, 4762);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, p);
    			append_dev(p, q);
    			append_dev(q, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			dispose = listen_dev(span, "click", click_handler_15, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*thoughts*/ 8 && t0_value !== (t0_value = /*thought*/ ctx[26] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(133:3) {#each thoughts as thought, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let body;
    	let main;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
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
    			attr_dev(main, "class", "svelte-e0or1i");
    			add_location(main, file, 30, 0, 550);
    			attr_dev(body, "class", "svelte-e0or1i");
    			add_location(body, file, 29, 0, 543);
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
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(main, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*step*/ ctx[0] == "acceptletgo") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					if_block2.m(main, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*step*/ ctx[0] == "intospace") {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_3(ctx);
    					if_block3.c();
    					if_block3.m(main, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*step*/ ctx[0] == "writekeep") {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					if_block4.m(main, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*step*/ ctx[0] == "acceptkeep") {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_1(ctx);
    					if_block5.c();
    					if_block5.m(main, t5);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*step*/ ctx[0] == "kept") {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block(ctx);
    					if_block6.c();
    					if_block6.m(main, null);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block0);
    		},
    		o: noop,
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
    		id: create_fragment.name,
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
    		$$invalidate(1, letgothought = "");
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
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
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
