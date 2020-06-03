
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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

    /* src/App.svelte generated by Svelte v3.19.1 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    // (26:1) {#if step=='choose'}
    function create_if_block_6(ctx) {
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div3;
    	let div1;
    	let h10;
    	let t2;
    	let button0;
    	let t4;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let div2;
    	let h11;
    	let t7;
    	let button1;
    	let t9;
    	let button2;
    	let t11;
    	let img2;
    	let img2_src_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Got some intrusive thoughts you want to let go?";
    			t2 = space();
    			button0 = element("button");
    			button0.textContent = "Let go";
    			t4 = space();
    			img1 = element("img");
    			t5 = space();
    			div2 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Got some positive thoughts you want to keep?";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Keep";
    			t9 = space();
    			button2 = element("button");
    			button2.textContent = "Kept";
    			t11 = space();
    			img2 = element("img");
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-173xkbd");
    			add_location(img0, file, 26, 19, 514);
    			attr_dev(div0, "class", "logo svelte-173xkbd");
    			add_location(div0, file, 26, 1, 496);
    			attr_dev(h10, "class", "h1-start svelte-173xkbd");
    			add_location(h10, file, 29, 3, 617);
    			attr_dev(button0, "class", "btn-start svelte-173xkbd");
    			add_location(button0, file, 30, 3, 694);
    			attr_dev(img1, "class", "img-letgo svelte-173xkbd");
    			if (img1.src !== (img1_src_value = "./assets/dandelion.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Let Go Picture");
    			add_location(img1, file, 31, 3, 772);
    			attr_dev(div1, "class", "letgo svelte-173xkbd");
    			add_location(div1, file, 28, 2, 594);
    			attr_dev(h11, "class", "h1-start svelte-173xkbd");
    			add_location(h11, file, 34, 3, 879);
    			attr_dev(button1, "class", "btn-start svelte-173xkbd");
    			add_location(button1, file, 35, 3, 953);
    			attr_dev(button2, "class", "btn-start svelte-173xkbd");
    			add_location(button2, file, 36, 3, 1028);
    			attr_dev(img2, "class", "img-keep svelte-173xkbd");
    			if (img2.src !== (img2_src_value = "./assets/keep.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Keep Picture");
    			add_location(img2, file, 37, 3, 1098);
    			attr_dev(div2, "class", "keep svelte-173xkbd");
    			add_location(div2, file, 33, 2, 857);
    			attr_dev(div3, "class", "choose svelte-173xkbd");
    			add_location(div3, file, 27, 1, 571);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, h10);
    			append_dev(div1, t2);
    			append_dev(div1, button0);
    			append_dev(div1, t4);
    			append_dev(div1, img1);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, h11);
    			append_dev(div2, t7);
    			append_dev(div2, button1);
    			append_dev(div2, t9);
    			append_dev(div2, button2);
    			append_dev(div2, t11);
    			append_dev(div2, img2);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false),
    				listen_dev(button2, "click", /*click_handler_2*/ ctx[8], false, false, false)
    			];
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(26:1) {#if step=='choose'}",
    		ctx
    	});

    	return block;
    }

    // (44:1) {#if step=='writeletgo'}
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
    			attr_dev(img0, "class", "svelte-173xkbd");
    			add_location(img0, file, 44, 20, 1251);
    			attr_dev(div0, "class", "logo svelte-173xkbd");
    			add_location(div0, file, 44, 2, 1233);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-173xkbd");
    			add_location(img1, file, 45, 74, 1380);
    			attr_dev(div1, "class", "back svelte-173xkbd");
    			add_location(div1, file, 45, 2, 1308);
    			attr_dev(h1, "class", "h1-write svelte-173xkbd");
    			add_location(h1, file, 47, 3, 1463);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", "Write down your thoughts...");
    			attr_dev(textarea, "class", "svelte-173xkbd");
    			add_location(textarea, file, 48, 3, 1536);
    			attr_dev(button, "class", "svelte-173xkbd");
    			add_location(button, file, 49, 3, 1639);
    			attr_dev(div2, "class", "writeletgo svelte-173xkbd");
    			add_location(div2, file, 46, 2, 1435);
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
    			set_input_value(textarea, /*letgothought*/ ctx[2]);
    			append_dev(div2, t4);
    			append_dev(div2, button);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_3*/ ctx[9], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[10]),
    				listen_dev(button, "click", /*click_handler_4*/ ctx[11], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 4) {
    				set_input_value(textarea, /*letgothought*/ ctx[2]);
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
    		source: "(44:1) {#if step=='writeletgo'}",
    		ctx
    	});

    	return block;
    }

    // (53:1) {#if step=='acceptletgo'}
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
    			t2 = text(/*letgothought*/ ctx[2]);
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
    			attr_dev(img0, "class", "svelte-173xkbd");
    			add_location(img0, file, 53, 20, 1783);
    			attr_dev(div0, "class", "logo svelte-173xkbd");
    			add_location(div0, file, 53, 2, 1765);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-173xkbd");
    			add_location(img1, file, 54, 78, 1916);
    			attr_dev(div1, "class", "back svelte-173xkbd");
    			add_location(div1, file, 54, 2, 1840);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-173xkbd");
    			add_location(q, file, 57, 27, 2101);
    			attr_dev(p0, "class", "acceptText svelte-173xkbd");
    			add_location(p0, file, 57, 5, 2079);
    			attr_dev(div2, "class", "acceptGuidance svelte-173xkbd");
    			add_location(div2, file, 56, 4, 2045);
    			attr_dev(h1, "class", "h1-write svelte-173xkbd");
    			add_location(h1, file, 60, 5, 2183);
    			attr_dev(p1, "class", "svelte-173xkbd");
    			add_location(p1, file, 61, 5, 2230);
    			attr_dev(p2, "class", "svelte-173xkbd");
    			add_location(p2, file, 62, 5, 2285);
    			attr_dev(p3, "class", "svelte-173xkbd");
    			add_location(p3, file, 64, 5, 2393);
    			attr_dev(button, "class", "svelte-173xkbd");
    			add_location(button, file, 66, 5, 2434);
    			attr_dev(div3, "class", "acceptGuidance svelte-173xkbd");
    			add_location(div3, file, 59, 4, 2149);
    			attr_dev(div4, "class", "acceptletgo svelte-173xkbd");
    			set_style(div4, "background-image", "url('" + bgAccept + "')");
    			add_location(div4, file, 55, 2, 1971);
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
    				listen_dev(div1, "click", /*click_handler_5*/ ctx[12], false, false, false),
    				listen_dev(button, "click", /*click_handler_6*/ ctx[13], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 4) set_data_dev(t2, /*letgothought*/ ctx[2]);
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
    		source: "(53:1) {#if step=='acceptletgo'}",
    		ctx
    	});

    	return block;
    }

    // (71:1) {#if step=='intospace'}
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
    			attr_dev(img0, "class", "svelte-173xkbd");
    			add_location(img0, file, 71, 19, 2595);
    			attr_dev(div0, "class", "logo svelte-173xkbd");
    			add_location(div0, file, 71, 1, 2577);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-173xkbd");
    			add_location(img1, file, 72, 73, 2723);
    			attr_dev(div1, "class", "back svelte-173xkbd");
    			add_location(div1, file, 72, 1, 2651);
    			attr_dev(h1, "class", "svelte-173xkbd");
    			add_location(h1, file, 74, 3, 2848);
    			attr_dev(button, "class", "svelte-173xkbd");
    			add_location(button, file, 75, 3, 2895);
    			attr_dev(div2, "class", "intospace svelte-173xkbd");
    			set_style(div2, "background-image", "url('" + bgSpace + "')");
    			add_location(div2, file, 73, 2, 2778);
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
    				listen_dev(div1, "click", /*click_handler_7*/ ctx[14], false, false, false),
    				listen_dev(button, "click", /*click_handler_8*/ ctx[15], false, false, false)
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
    		source: "(71:1) {#if step=='intospace'}",
    		ctx
    	});

    	return block;
    }

    // (81:1) {#if step=='writekeep'}
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
    			attr_dev(img0, "class", "svelte-173xkbd");
    			add_location(img0, file, 81, 20, 3030);
    			attr_dev(div0, "class", "logo svelte-173xkbd");
    			add_location(div0, file, 81, 2, 3012);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-173xkbd");
    			add_location(img1, file, 82, 72, 3157);
    			attr_dev(div1, "class", "back svelte-173xkbd");
    			add_location(div1, file, 82, 2, 3087);
    			attr_dev(h1, "class", "h1-write svelte-173xkbd");
    			add_location(h1, file, 84, 3, 3241);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "class", "svelte-173xkbd");
    			add_location(textarea, file, 85, 3, 3380);
    			attr_dev(button, "class", "svelte-173xkbd");
    			add_location(button, file, 86, 3, 3441);
    			attr_dev(div2, "class", "writekeep svelte-173xkbd");
    			add_location(div2, file, 83, 2, 3212);
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
    			set_input_value(textarea, /*keepthought*/ ctx[1]);
    			append_dev(div2, t4);
    			append_dev(div2, button);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_9*/ ctx[16], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[17]),
    				listen_dev(button, "click", /*click_handler_10*/ ctx[18], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 2) {
    				set_input_value(textarea, /*keepthought*/ ctx[1]);
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
    		source: "(81:1) {#if step=='writekeep'}",
    		ctx
    	});

    	return block;
    }

    // (91:1) {#if step=='acceptkeep'}
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
    			t2 = text(/*keepthought*/ ctx[1]);
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
    			attr_dev(img0, "class", "svelte-173xkbd");
    			add_location(img0, file, 91, 20, 3615);
    			attr_dev(div0, "class", "logo svelte-173xkbd");
    			add_location(div0, file, 91, 2, 3597);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-173xkbd");
    			add_location(img1, file, 92, 57, 3727);
    			attr_dev(div1, "class", "back svelte-173xkbd");
    			add_location(div1, file, 92, 2, 3672);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-173xkbd");
    			add_location(q, file, 95, 27, 3866);
    			attr_dev(p0, "class", "acceptText svelte-173xkbd");
    			add_location(p0, file, 95, 5, 3844);
    			attr_dev(div2, "class", "acceptGuidance svelte-173xkbd");
    			add_location(div2, file, 94, 3, 3810);
    			attr_dev(h1, "class", "h1-write svelte-173xkbd");
    			add_location(h1, file, 98, 5, 3945);
    			attr_dev(p1, "class", "svelte-173xkbd");
    			add_location(p1, file, 99, 5, 3985);
    			attr_dev(button0, "class", "svelte-173xkbd");
    			add_location(button0, file, 100, 5, 4115);
    			attr_dev(button1, "class", "svelte-173xkbd");
    			add_location(button1, file, 101, 6, 4225);
    			attr_dev(div3, "class", "acceptGuidance svelte-173xkbd");
    			add_location(div3, file, 97, 3, 3911);
    			attr_dev(div4, "class", "acceptkeep svelte-173xkbd");
    			add_location(div4, file, 93, 2, 3782);
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
    				listen_dev(div1, "click", /*click_handler_11*/ ctx[19], false, false, false),
    				listen_dev(button0, "click", /*click_handler_12*/ ctx[20], false, false, false),
    				listen_dev(button1, "click", /*click_handler_13*/ ctx[21], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 2) set_data_dev(t2, /*keepthought*/ ctx[1]);
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
    		source: "(91:1) {#if step=='acceptkeep'}",
    		ctx
    	});

    	return block;
    }

    // (107:1) {#if step=='kept'}
    function create_if_block(ctx) {
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
    	let t4;
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
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Kept thoughts";
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			button = element("button");
    			button.textContent = "Back to home";
    			if (img0.src !== (img0_src_value = "./assets/feelfinelogo.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Logo");
    			attr_dev(img0, "class", "svelte-173xkbd");
    			add_location(img0, file, 107, 19, 4379);
    			attr_dev(div0, "class", "logo svelte-173xkbd");
    			add_location(div0, file, 107, 1, 4361);
    			if (img1.src !== (img1_src_value = "./assets/back.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Arrow Back");
    			attr_dev(img1, "class", "svelte-173xkbd");
    			add_location(img1, file, 108, 57, 4491);
    			attr_dev(div1, "class", "back svelte-173xkbd");
    			add_location(div1, file, 108, 1, 4435);
    			attr_dev(h1, "class", "svelte-173xkbd");
    			add_location(h1, file, 110, 2, 4609);
    			attr_dev(button, "class", "svelte-173xkbd");
    			add_location(button, file, 114, 3, 4729);
    			attr_dev(div2, "class", "kept svelte-173xkbd");
    			set_style(div2, "background-image", "url('" + bgKept + "')");
    			add_location(div2, file, 109, 2, 4546);
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

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t4);
    			append_dev(div2, button);

    			dispose = [
    				listen_dev(div1, "click", /*click_handler_14*/ ctx[22], false, false, false),
    				listen_dev(button, "click", /*click_handler_15*/ ctx[23], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*thoughts*/ 8) {
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
    						each_blocks[i].m(div2, t4);
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
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(107:1) {#if step=='kept'}",
    		ctx
    	});

    	return block;
    }

    // (112:2) {#each thoughts as thought}
    function create_each_block(ctx) {
    	let p;
    	let q;
    	let t_value = /*thought*/ ctx[24] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			q = element("q");
    			t = text(t_value);
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-173xkbd");
    			add_location(q, file, 112, 25, 4687);
    			attr_dev(p, "class", "acceptText svelte-173xkbd");
    			add_location(p, file, 112, 3, 4665);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, q);
    			append_dev(q, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*thoughts*/ 8 && t_value !== (t_value = /*thought*/ ctx[24] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(112:2) {#each thoughts as thought}",
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
    			attr_dev(main, "class", "svelte-173xkbd");
    			add_location(main, file, 24, 0, 466);
    			attr_dev(body, "class", "svelte-173xkbd");
    			add_location(body, file, 23, 0, 459);
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
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
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
    		i: noop,
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
    	let keepthought;
    	let letgothought;
    	let randomThought;

    	const setRandom = () => {
    		randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
    	};

    	let thoughts = [];
    	const click_handler = () => $$invalidate(0, step = "writeletgo");
    	const click_handler_1 = () => $$invalidate(0, step = "writekeep");
    	const click_handler_2 = () => $$invalidate(0, step = "kept");

    	const click_handler_3 = () => {
    		$$invalidate(0, step = "choose");
    		$$invalidate(2, letgothought = "");
    	};

    	function textarea_input_handler() {
    		letgothought = this.value;
    		$$invalidate(2, letgothought);
    	}

    	const click_handler_4 = () => $$invalidate(0, step = "acceptletgo");

    	const click_handler_5 = () => {
    		$$invalidate(0, step = "writeletgo");
    		$$invalidate(2, letgothought = "");
    	};

    	const click_handler_6 = () => {
    		$$invalidate(0, step = "intospace");
    		$$invalidate(2, letgothought = "");
    	};

    	const click_handler_7 = () => {
    		$$invalidate(0, step = "choose");
    		$$invalidate(2, letgothought = "");
    	};

    	const click_handler_8 = () => $$invalidate(0, step = "choose");

    	const click_handler_9 = () => {
    		$$invalidate(0, step = "choose");
    		$$invalidate(1, keepthought = "");
    	};

    	function textarea_input_handler_1() {
    		keepthought = this.value;
    		$$invalidate(1, keepthought);
    	}

    	const click_handler_10 = () => {
    		$$invalidate(0, step = "acceptkeep");
    		$$invalidate(3, thoughts = [keepthought, ...thoughts]);
    	};

    	const click_handler_11 = () => {
    		$$invalidate(0, step = "writekeep");
    	};

    	const click_handler_12 = () => {
    		$$invalidate(1, keepthought = "");
    		$$invalidate(0, step = "writekeep");
    	};

    	const click_handler_13 = () => {
    		$$invalidate(0, step = "kept");
    		$$invalidate(1, keepthought = "");
    	};

    	const click_handler_14 = () => {
    		$$invalidate(0, step = "acceptkeep");
    	};

    	const click_handler_15 = () => {
    		$$invalidate(0, step = "choose");
    	};

    	$$self.$capture_state = () => ({
    		step,
    		keepthought,
    		letgothought,
    		randomThought,
    		setRandom,
    		thoughts,
    		bgAccept,
    		bgSpace,
    		bgKept,
    		Math,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("step" in $$props) $$invalidate(0, step = $$props.step);
    		if ("keepthought" in $$props) $$invalidate(1, keepthought = $$props.keepthought);
    		if ("letgothought" in $$props) $$invalidate(2, letgothought = $$props.letgothought);
    		if ("randomThought" in $$props) randomThought = $$props.randomThought;
    		if ("thoughts" in $$props) $$invalidate(3, thoughts = $$props.thoughts);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*thoughts*/ 8) {
    			 console.log(thoughts);
    		}
    	};

    	return [
    		step,
    		keepthought,
    		letgothought,
    		thoughts,
    		randomThought,
    		setRandom,
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
    		click_handler_15
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
