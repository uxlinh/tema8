
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
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (25:1) {#if step=='choose'}
    function create_if_block_6(ctx) {
    	let div2;
    	let div0;
    	let h10;
    	let t1;
    	let button0;
    	let t3;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div1;
    	let h11;
    	let t6;
    	let button1;
    	let t8;
    	let img1;
    	let img1_src_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Got some intrusive thoughts you want to let go?";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Let go";
    			t3 = space();
    			img0 = element("img");
    			t4 = space();
    			div1 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Got some positive thoughts you want to keep?";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Keep";
    			t8 = space();
    			img1 = element("img");
    			attr_dev(h10, "class", "h1-start svelte-6yyobw");
    			add_location(h10, file, 27, 3, 543);
    			attr_dev(button0, "class", "btn-start svelte-6yyobw");
    			add_location(button0, file, 28, 3, 620);
    			attr_dev(img0, "class", "img-letgo svelte-6yyobw");
    			if (img0.src !== (img0_src_value = "./assets/dandelion.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Let Go Picture");
    			add_location(img0, file, 29, 3, 698);
    			attr_dev(div0, "class", "letgo svelte-6yyobw");
    			add_location(div0, file, 26, 2, 520);
    			attr_dev(h11, "class", "h1-start svelte-6yyobw");
    			add_location(h11, file, 32, 3, 805);
    			attr_dev(button1, "class", "btn-start svelte-6yyobw");
    			add_location(button1, file, 33, 3, 879);
    			attr_dev(img1, "class", "img-keep svelte-6yyobw");
    			if (img1.src !== (img1_src_value = "./assets/keep.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Keep Picture");
    			add_location(img1, file, 34, 3, 954);
    			attr_dev(div1, "class", "keep svelte-6yyobw");
    			add_location(div1, file, 31, 2, 783);
    			attr_dev(div2, "class", "choose svelte-6yyobw");
    			add_location(div2, file, 25, 1, 496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h10);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, img0);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, h11);
    			append_dev(div1, t6);
    			append_dev(div1, button1);
    			append_dev(div1, t8);
    			append_dev(div1, img1);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false)
    			];
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(25:1) {#if step=='choose'}",
    		ctx
    	});

    	return block;
    }

    // (41:1) {#if step=='writeletgo'}
    function create_if_block_5(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let textarea;
    	let t2;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Recognize your thoughts and write them down";
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			button = element("button");
    			button.textContent = "I have recognised my thoughts";
    			attr_dev(h1, "class", "svelte-6yyobw");
    			add_location(h1, file, 42, 3, 1117);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "15");
    			attr_dev(textarea, "placeholder", "Write down your thoughts...");
    			attr_dev(textarea, "class", "svelte-6yyobw");
    			add_location(textarea, file, 43, 3, 1173);
    			attr_dev(button, "class", "svelte-6yyobw");
    			add_location(button, file, 44, 3, 1276);
    			attr_dev(div, "class", "writeletgo svelte-6yyobw");
    			add_location(div, file, 41, 2, 1089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*letgothought*/ ctx[2]);
    			append_dev(div, t2);
    			append_dev(div, button);

    			dispose = [
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[8]),
    				listen_dev(button, "click", /*click_handler_2*/ ctx[9], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 4) {
    				set_input_value(textarea, /*letgothought*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(41:1) {#if step=='writeletgo'}",
    		ctx
    	});

    	return block;
    }

    // (48:1) {#if step=='acceptletgo'}
    function create_if_block_4(ctx) {
    	let div2;
    	let div0;
    	let p0;
    	let q;
    	let t0;
    	let t1;
    	let div1;
    	let h1;
    	let t3;
    	let p1;
    	let t5;
    	let p2;
    	let t7;
    	let p3;
    	let t9;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			q = element("q");
    			t0 = text(/*letgothought*/ ctx[2]);
    			t1 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Accept & Let go";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Accept the thoughts and feelings you have.";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "Do not give the thoughts too much room, just enough attention and accept that they exist.";
    			t7 = space();
    			p3 = element("p");
    			p3.textContent = "But leave them alone.";
    			t9 = space();
    			button = element("button");
    			button.textContent = "Accept & Let go";
    			attr_dev(q, "id", "b");
    			attr_dev(q, "class", "svelte-6yyobw");
    			add_location(q, file, 50, 27, 1532);
    			attr_dev(p0, "class", "acceptText svelte-6yyobw");
    			add_location(p0, file, 50, 5, 1510);
    			attr_dev(div0, "class", "acceptGuidance svelte-6yyobw");
    			add_location(div0, file, 49, 4, 1476);
    			attr_dev(h1, "class", "svelte-6yyobw");
    			add_location(h1, file, 53, 5, 1614);
    			attr_dev(p1, "class", "svelte-6yyobw");
    			add_location(p1, file, 54, 5, 1644);
    			attr_dev(p2, "class", "svelte-6yyobw");
    			add_location(p2, file, 55, 5, 1699);
    			attr_dev(p3, "class", "svelte-6yyobw");
    			add_location(p3, file, 57, 5, 1807);
    			attr_dev(button, "class", "svelte-6yyobw");
    			add_location(button, file, 59, 5, 1848);
    			attr_dev(div1, "class", "acceptGuidance svelte-6yyobw");
    			add_location(div1, file, 52, 4, 1580);
    			attr_dev(div2, "class", "acceptletgo svelte-6yyobw");
    			set_style(div2, "background-image", "url('" + bgAccept + "')");
    			add_location(div2, file, 48, 2, 1402);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, p0);
    			append_dev(p0, q);
    			append_dev(q, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t3);
    			append_dev(div1, p1);
    			append_dev(div1, t5);
    			append_dev(div1, p2);
    			append_dev(div1, t7);
    			append_dev(div1, p3);
    			append_dev(div1, t9);
    			append_dev(div1, button);
    			dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[10], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 4) set_data_dev(t0, /*letgothought*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(48:1) {#if step=='acceptletgo'}",
    		ctx
    	});

    	return block;
    }

    // (64:1) {#if step=='intospace'}
    function create_if_block_3(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Your thoughts are flown into space";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Back to home";
    			attr_dev(h1, "class", "svelte-6yyobw");
    			add_location(h1, file, 65, 3, 2062);
    			attr_dev(button, "class", "svelte-6yyobw");
    			add_location(button, file, 66, 3, 2109);
    			attr_dev(div, "class", "intospace svelte-6yyobw");
    			set_style(div, "background-image", "url('" + bgSpace + "')");
    			add_location(div, file, 64, 2, 1992);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, button);
    			dispose = listen_dev(button, "click", /*click_handler_4*/ ctx[11], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(64:1) {#if step=='intospace'}",
    		ctx
    	});

    	return block;
    }

    // (72:1) {#if step=='writekeep'}
    function create_if_block_2(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let textarea;
    	let t2;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Write a positive thought or feedback you have received. For example: “What would your friends say about you?”";
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Keep thoughts";
    			attr_dev(h1, "class", "svelte-6yyobw");
    			add_location(h1, file, 73, 3, 2255);
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "rows", "15");
    			attr_dev(textarea, "class", "svelte-6yyobw");
    			add_location(textarea, file, 74, 3, 2377);
    			attr_dev(button, "class", "svelte-6yyobw");
    			add_location(button, file, 75, 3, 2438);
    			attr_dev(div, "class", "writekeep svelte-6yyobw");
    			add_location(div, file, 72, 2, 2226);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*keepthought*/ ctx[1]);
    			append_dev(div, t2);
    			append_dev(div, button);

    			dispose = [
    				listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[12]),
    				listen_dev(button, "click", /*click_handler_5*/ ctx[13], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 2) {
    				set_input_value(textarea, /*keepthought*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(72:1) {#if step=='writekeep'}",
    		ctx
    	});

    	return block;
    }

    // (79:1) {#if step=='acceptkeep'}
    function create_if_block_1(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let p;
    	let span0;
    	let t3;
    	let span1;
    	let t5;
    	let div0;
    	let button0;
    	let t7;
    	let button1;
    	let t9;
    	let button2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Kept it!";
    			t1 = space();
    			p = element("p");
    			span0 = element("span");
    			span0.textContent = "\"";
    			t3 = text(/*keepthought*/ ctx[1]);
    			span1 = element("span");
    			span1.textContent = "\"";
    			t5 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Back to home";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Keep more positive thoughts";
    			t9 = space();
    			button2 = element("button");
    			button2.textContent = "See your kept thoughts";
    			attr_dev(h1, "class", "svelte-6yyobw");
    			add_location(h1, file, 80, 3, 2663);
    			attr_dev(span0, "class", "svelte-6yyobw");
    			add_location(span0, file, 81, 6, 2687);
    			attr_dev(span1, "class", "svelte-6yyobw");
    			add_location(span1, file, 81, 33, 2714);
    			attr_dev(p, "class", "svelte-6yyobw");
    			add_location(p, file, 81, 3, 2684);
    			attr_dev(button0, "class", "svelte-6yyobw");
    			add_location(button0, file, 83, 4, 2769);
    			attr_dev(button1, "class", "svelte-6yyobw");
    			add_location(button1, file, 84, 4, 2840);
    			attr_dev(button2, "class", "svelte-6yyobw");
    			add_location(button2, file, 85, 4, 2948);
    			attr_dev(div0, "class", "btn-acceptkeep svelte-6yyobw");
    			add_location(div0, file, 82, 3, 2736);
    			attr_dev(div1, "class", "acceptkeep svelte-6yyobw");
    			set_style(div1, "background-image", "url('" + bgKept + "')");
    			add_location(div1, file, 79, 2, 2593);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, p);
    			append_dev(p, span0);
    			append_dev(p, t3);
    			append_dev(p, span1);
    			append_dev(div1, t5);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t7);
    			append_dev(div0, button1);
    			append_dev(div0, t9);
    			append_dev(div0, button2);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler_6*/ ctx[14], false, false, false),
    				listen_dev(button1, "click", /*click_handler_7*/ ctx[15], false, false, false),
    				listen_dev(button2, "click", /*click_handler_8*/ ctx[16], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 2) set_data_dev(t3, /*keepthought*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(79:1) {#if step=='acceptkeep'}",
    		ctx
    	});

    	return block;
    }

    // (90:1) {#if step=='kept'}
    function create_if_block(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let t2;
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
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Kept thoughts";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			button = element("button");
    			button.textContent = "Back to home";
    			attr_dev(h1, "class", "svelte-6yyobw");
    			add_location(h1, file, 91, 2, 3152);
    			attr_dev(button, "class", "svelte-6yyobw");
    			add_location(button, file, 95, 3, 3241);
    			attr_dev(div, "class", "kept svelte-6yyobw");
    			set_style(div, "background-image", "url('" + bgKept + "')");
    			add_location(div, file, 90, 2, 3089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t2);
    			append_dev(div, button);
    			dispose = listen_dev(button, "click", /*click_handler_9*/ ctx[17], false, false, false);
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
    						each_blocks[i].m(div, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(90:1) {#if step=='kept'}",
    		ctx
    	});

    	return block;
    }

    // (93:2) {#each thoughts as thought}
    function create_each_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*thought*/ ctx[18] + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("\"");
    			t1 = text(t1_value);
    			t2 = text("\"");
    			attr_dev(p, "class", "svelte-6yyobw");
    			add_location(p, file, 93, 3, 3208);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*thoughts*/ 8 && t1_value !== (t1_value = /*thought*/ ctx[18] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(93:2) {#each thoughts as thought}",
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
    			attr_dev(main, "class", "svelte-6yyobw");
    			add_location(main, file, 23, 0, 466);
    			attr_dev(body, "class", "svelte-6yyobw");
    			add_location(body, file, 21, 0, 457);
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

    	function textarea_input_handler() {
    		letgothought = this.value;
    		$$invalidate(2, letgothought);
    	}

    	const click_handler_2 = () => $$invalidate(0, step = "acceptletgo");

    	const click_handler_3 = () => {
    		$$invalidate(0, step = "intospace");
    		$$invalidate(2, letgothought = "");
    	};

    	const click_handler_4 = () => $$invalidate(0, step = "choose");

    	function textarea_input_handler_1() {
    		keepthought = this.value;
    		$$invalidate(1, keepthought);
    	}

    	const click_handler_5 = () => {
    		$$invalidate(0, step = "acceptkeep");
    		$$invalidate(3, thoughts = [keepthought, ...thoughts]);
    	};

    	const click_handler_6 = () => {
    		$$invalidate(0, step = "choose");
    	};

    	const click_handler_7 = () => {
    		$$invalidate(1, keepthought = "");
    		$$invalidate(0, step = "writekeep");
    	};

    	const click_handler_8 = () => {
    		$$invalidate(0, step = "kept");
    		$$invalidate(1, keepthought = "");
    	};

    	const click_handler_9 = () => {
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
    		textarea_input_handler,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		textarea_input_handler_1,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9
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
