
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

    // (20:1) {#if step == 'choose'}
    function create_if_block_6(ctx) {
    	let div2;
    	let div0;
    	let h50;
    	let t1;
    	let button0;
    	let t3;
    	let div1;
    	let h51;
    	let t5;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			h50.textContent = "tekst";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "let go";
    			t3 = space();
    			div1 = element("div");
    			h51 = element("h5");
    			h51.textContent = "tekst";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "keep";
    			add_location(h50, file, 22, 3, 539);
    			add_location(button0, file, 23, 3, 557);
    			attr_dev(div0, "class", "letgo svelte-795v9h");
    			add_location(div0, file, 21, 2, 516);
    			add_location(h51, file, 26, 3, 647);
    			add_location(button1, file, 27, 3, 665);
    			attr_dev(div1, "class", "keep svelte-795v9h");
    			add_location(div1, file, 25, 2, 625);
    			attr_dev(div2, "class", "choose svelte-795v9h");
    			add_location(div2, file, 20, 1, 492);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h50);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, h51);
    			append_dev(div1, t5);
    			append_dev(div1, button1);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler*/ ctx[7], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false)
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
    		source: "(20:1) {#if step == 'choose'}",
    		ctx
    	});

    	return block;
    }

    // (32:1) {#if step=='writeletgo'}
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
    			h1.textContent = "let go";
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			button = element("button");
    			button.textContent = "I have recognised my thoughts";
    			add_location(h1, file, 33, 3, 800);
    			attr_dev(textarea, "cols", "30");
    			attr_dev(textarea, "rows", "10");
    			add_location(textarea, file, 34, 3, 819);
    			add_location(button, file, 35, 3, 881);
    			attr_dev(div, "class", "writeletgo svelte-795v9h");
    			add_location(div, file, 32, 2, 772);
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
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[9]),
    				listen_dev(button, "click", /*click_handler_2*/ ctx[10], false, false, false)
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
    		source: "(32:1) {#if step=='writeletgo'}",
    		ctx
    	});

    	return block;
    }

    // (39:1) {#if step=='acceptletgo'}
    function create_if_block_4(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let t2;
    	let t3;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Accept let go";
    			t1 = space();
    			p = element("p");
    			t2 = text(/*letgothought*/ ctx[2]);
    			t3 = space();
    			button = element("button");
    			button.textContent = "into space";
    			add_location(h1, file, 40, 3, 1036);
    			add_location(p, file, 41, 3, 1062);
    			add_location(button, file, 42, 3, 1087);
    			attr_dev(div, "class", "acceptletgo svelte-795v9h");
    			add_location(div, file, 39, 2, 1007);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(div, t3);
    			append_dev(div, button);
    			dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[11], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letgothought*/ 4) set_data_dev(t2, /*letgothought*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(39:1) {#if step=='acceptletgo'}",
    		ctx
    	});

    	return block;
    }

    // (46:1) {#if step=='intospace'}
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
    			h1.textContent = "into space";
    			t1 = space();
    			button = element("button");
    			button.textContent = "back to choose";
    			add_location(h1, file, 47, 3, 1242);
    			add_location(button, file, 48, 3, 1265);
    			attr_dev(div, "class", "intospace svelte-795v9h");
    			add_location(div, file, 46, 2, 1215);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, button);
    			dispose = listen_dev(button, "click", /*click_handler_4*/ ctx[12], false, false, false);
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
    		source: "(46:1) {#if step=='intospace'}",
    		ctx
    	});

    	return block;
    }

    // (52:1) {#if step=='writekeep'}
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
    			h1.textContent = "keep";
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Keep thought";
    			add_location(h1, file, 53, 3, 1398);
    			attr_dev(textarea, "cols", "30");
    			attr_dev(textarea, "rows", "10");
    			add_location(textarea, file, 54, 3, 1415);
    			add_location(button, file, 55, 3, 1476);
    			attr_dev(div, "class", "writekeep svelte-795v9h");
    			add_location(div, file, 52, 2, 1369);
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
    				listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[13]),
    				listen_dev(button, "click", /*click_handler_5*/ ctx[14], false, false, false)
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
    		source: "(52:1) {#if step=='writekeep'}",
    		ctx
    	});

    	return block;
    }

    // (59:1) {#if step=='acceptkeep'}
    function create_if_block_1(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let t2;
    	let t3;
    	let button0;
    	let t5;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "accept keep";
    			t1 = space();
    			p = element("p");
    			t2 = text(/*keepthought*/ ctx[1]);
    			t3 = space();
    			button0 = element("button");
    			button0.textContent = "more thoughts";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "random";
    			add_location(h1, file, 60, 3, 1657);
    			add_location(p, file, 61, 3, 1681);
    			add_location(button0, file, 62, 3, 1705);
    			add_location(button1, file, 63, 3, 1795);
    			attr_dev(div, "class", "acceptkeep svelte-795v9h");
    			add_location(div, file, 59, 2, 1629);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(div, t3);
    			append_dev(div, button0);
    			append_dev(div, t5);
    			append_dev(div, button1);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler_6*/ ctx[15], false, false, false),
    				listen_dev(button1, "click", /*click_handler_7*/ ctx[16], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*keepthought*/ 2) set_data_dev(t2, /*keepthought*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(59:1) {#if step=='acceptkeep'}",
    		ctx
    	});

    	return block;
    }

    // (67:1) {#if step=='random'}
    function create_if_block(ctx) {
    	let div;
    	let p;
    	let t0;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(/*randomThought*/ ctx[3]);
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "forfra";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "random";
    			add_location(p, file, 68, 3, 1951);
    			add_location(button0, file, 69, 3, 1978);
    			add_location(button1, file, 70, 3, 2043);
    			attr_dev(div, "class", "random svelte-795v9h");
    			add_location(div, file, 67, 2, 1927);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(div, t1);
    			append_dev(div, button0);
    			append_dev(div, t3);
    			append_dev(div, button1);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler_8*/ ctx[17], false, false, false),
    				listen_dev(button1, "click", /*click_handler_9*/ ctx[18], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*randomThought*/ 8) set_data_dev(t0, /*randomThought*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(67:1) {#if step=='random'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
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
    	let if_block6 = /*step*/ ctx[0] == "random" && create_if_block(ctx);

    	const block = {
    		c: function create() {
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
    			attr_dev(main, "class", "svelte-795v9h");
    			add_location(main, file, 18, 0, 460);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
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

    			if (/*step*/ ctx[0] == "random") {
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
    			if (detaching) detach_dev(main);
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

    function instance($$self, $$props, $$invalidate) {
    	let step = "choose";
    	let keepthought;
    	let letgothought;
    	let randomThought;

    	const setRandom = () => {
    		$$invalidate(3, randomThought = thoughts[Math.floor(Math.random() * thoughts.length)]);
    	};

    	let thoughts = [];

    	const getRandom = () => {
    		let nr = Math.ceil(Math.random() * thoughts.length);
    		console.log(nr);
    		return thoughts[nr];
    	};

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
    		$$invalidate(4, thoughts = [keepthought, ...thoughts]);
    	};

    	const click_handler_6 = () => {
    		$$invalidate(1, keepthought = "");
    		$$invalidate(0, step = "choose");
    	};

    	const click_handler_7 = () => {
    		$$invalidate(0, step = "random");
    		$$invalidate(1, keepthought = "");
    		setRandom();
    	};

    	const click_handler_8 = () => {
    		$$invalidate(0, step = "choose");
    	};

    	const click_handler_9 = () => {
    	};

    	$$self.$capture_state = () => ({
    		step,
    		keepthought,
    		letgothought,
    		randomThought,
    		setRandom,
    		thoughts,
    		getRandom,
    		Math,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("step" in $$props) $$invalidate(0, step = $$props.step);
    		if ("keepthought" in $$props) $$invalidate(1, keepthought = $$props.keepthought);
    		if ("letgothought" in $$props) $$invalidate(2, letgothought = $$props.letgothought);
    		if ("randomThought" in $$props) $$invalidate(3, randomThought = $$props.randomThought);
    		if ("thoughts" in $$props) $$invalidate(4, thoughts = $$props.thoughts);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*thoughts*/ 16) {
    			 console.log(thoughts);
    		}
    	};

    	return [
    		step,
    		keepthought,
    		letgothought,
    		randomThought,
    		thoughts,
    		setRandom,
    		getRandom,
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
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
