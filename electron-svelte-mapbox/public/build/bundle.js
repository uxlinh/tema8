
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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

    const apikeys = {
        openweathermap: {
            api_key:'4c92609677c2fd4514e1b03c47ab1036'   
        },

        unsplash: {
            api_key: 'W0KNq2vRXukBjVzXTTwOG1lyMSc9FqDS57fn3Socbi0',
            secret:'IzKu6lkQ8IOhXcD3NrXG5cGWm2edCDi3dZiCuT6jsN0'
        },
        mapbox:{
            api_key:'pk.eyJ1Ijoic2ltbW9lIiwiYSI6ImNrNzNhem81ZjA4aWEzZnM1ZzJlcGo0YzIifQ.ydTMVEfBU_I_mXDxHwfY8Q' 
        },
        giphy:{
            api_key:'xLNiiuCTPYTZA4gHLsiuUk67YYS6K4tz'
        },
        oxford:{
            base_url:'https://od-api.oxforddictionaries.com/api/v2',
            app_id:'46b7f185',
            app_key:'b0c747f6ecd5d547bc76cbb121380b11'
        },
        worldnews:{
            api_key:'ed87ebff01bb4f5998eed5fb8a0aba89' 
        },
        merrianwebster:{
            thesaurus:'6bee06be-3b53-4940-b051-26aee090936a',
            dictionary:'974433d0-206b-45e4-beb3-32ff3fdb027b'
        },
        wordnik:{
            api_key:'fxq4h9kmmr7xjq88rujiubj1r8gi48pjq246muecwzisv5iac'
        },
        spoonacular:{
            api_key: '385e8eeaca954d7385cdc0e96582aa67',
        },
        freeapis:[
            'http://www.datamuse.com/api/',   
            'https://deckofcardsapi.com/',
        ]
    };

    /* src/App.svelte generated by Svelte v3.19.1 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let script0;
    	let script0_src_value;
    	let script1;
    	let script1_src_value;
    	let link0;
    	let link1;
    	let t0;
    	let main;
    	let div5;
    	let div0;
    	let t1;
    	let div4;
    	let div1;
    	let t3;
    	let div2;
    	let t5;
    	let div3;
    	let dispose;

    	const block = {
    		c: function create() {
    			script0 = element("script");
    			script1 = element("script");
    			link0 = element("link");
    			link1 = element("link");
    			t0 = space();
    			main = element("main");
    			div5 = element("div");
    			div0 = element("div");
    			t1 = space();
    			div4 = element("div");
    			div1 = element("div");
    			div1.textContent = "night mode";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "directions";
    			t5 = space();
    			div3 = element("div");
    			div3.textContent = "add marker";
    			if (script0.src !== (script0_src_value = "https://api.mapbox.com/mapbox-gl-js/v1.8.0/mapbox-gl.js")) attr_dev(script0, "src", script0_src_value);
    			add_location(script0, file, 62, 1, 1449);
    			if (script1.src !== (script1_src_value = "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.0.2/mapbox-gl-directions.js")) attr_dev(script1, "src", script1_src_value);
    			add_location(script1, file, 63, 1, 1545);
    			attr_dev(link0, "href", "https://api.mapbox.com/mapbox-gl-js/v1.8.0/mapbox-gl.css");
    			attr_dev(link0, "rel", "stylesheet");
    			add_location(link0, file, 65, 1, 1668);
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "href", "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.0.2/mapbox-gl-directions.css");
    			attr_dev(link1, "type", "text/css");
    			add_location(link1, file, 66, 1, 1759);
    			attr_dev(div0, "id", "map");
    			attr_dev(div0, "class", "svelte-439tx8");
    			add_location(div0, file, 73, 2, 1941);
    			attr_dev(div1, "class", "svelte-439tx8");
    			toggle_class(div1, "active", /*nightMode*/ ctx[0]);
    			add_location(div1, file, 75, 3, 1986);
    			attr_dev(div2, "class", "svelte-439tx8");
    			toggle_class(div2, "active", /*directions*/ ctx[1]);
    			add_location(div2, file, 76, 3, 2065);
    			attr_dev(div3, "class", "svelte-439tx8");
    			add_location(div3, file, 77, 3, 2146);
    			attr_dev(div4, "class", "controls svelte-439tx8");
    			add_location(div4, file, 74, 2, 1960);
    			add_location(div5, file, 72, 1, 1933);
    			attr_dev(main, "class", "svelte-439tx8");
    			add_location(main, file, 71, 0, 1925);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, script0);
    			append_dev(document.head, script1);
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div5);
    			append_dev(div5, div0);
    			append_dev(div5, t1);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div4, t5);
    			append_dev(div4, div3);

    			dispose = [
    				listen_dev(script0, "load", /*init*/ ctx[2], false, false, false),
    				listen_dev(div1, "click", /*toggleNightMode*/ ctx[3], false, false, false),
    				listen_dev(div2, "click", /*toggleDirections*/ ctx[4], false, false, false),
    				listen_dev(div3, "click", /*addMarker*/ ctx[5], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*nightMode*/ 1) {
    				toggle_class(div1, "active", /*nightMode*/ ctx[0]);
    			}

    			if (dirty & /*directions*/ 2) {
    				toggle_class(div2, "active", /*directions*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(script0);
    			detach_dev(script1);
    			detach_dev(link0);
    			detach_dev(link1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			run_all(dispose);
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
    	let map;

    	const init = () => {
    		mapboxgl.accessToken = apikeys.mapbox.api_key;

    		map = new mapboxgl.Map({
    				container: "map",
    				style: "mapbox://styles/mapbox/streets-v8"
    			});

    		map.addControl(new mapboxgl.NavigationControl());
    	};

    	let nightMode, directions = false;

    	const toggleNightMode = node => {
    		if (nightMode) {
    			map.setStyle("mapbox://styles/mapbox/streets-v8");
    			$$invalidate(0, nightMode = false);
    		} else {
    			map.setStyle("mapbox://styles/mapbox/dark-v8");
    			$$invalidate(0, nightMode = true);
    		}
    	};

    	let directionCtrl;

    	const toggleDirections = node => {
    		if (!directions) {
    			directionCtrl = new MapboxDirections({ accessToken: mapboxgl.accessToken });
    			map.addControl(directionCtrl, "top-left");
    			$$invalidate(1, directions = true);
    		} else {
    			map.removeControl(directionCtrl);
    			$$invalidate(1, directions = false);
    		}
    	};

    	const addMarker = node => {
    		const marker = new mapboxgl.Marker({ draggable: true });
    		marker.setLngLat(map.getCenter());
    		marker.addTo(map);

    		marker.on("dragend", () => {
    			var bbox = [
    				[marker._pos.x - 5, marker._pos.y - 5],
    				[marker._pos.x + 5, marker._pos.y + 5]
    			];

    			var features = map.queryRenderedFeatures(bbox);
    			console.log(features);
    			var popup = new mapboxgl.Popup({ offset: 25 }).setText(`Du har sat markeren på ${marker._pos.x}, ${marker._pos.y}`);
    			marker.setPopup(popup);
    		});
    	};

    	$$self.$capture_state = () => ({
    		apikeys,
    		map,
    		init,
    		nightMode,
    		directions,
    		toggleNightMode,
    		directionCtrl,
    		toggleDirections,
    		addMarker,
    		mapboxgl,
    		MapboxDirections,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("map" in $$props) map = $$props.map;
    		if ("nightMode" in $$props) $$invalidate(0, nightMode = $$props.nightMode);
    		if ("directions" in $$props) $$invalidate(1, directions = $$props.directions);
    		if ("directionCtrl" in $$props) directionCtrl = $$props.directionCtrl;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [nightMode, directions, init, toggleNightMode, toggleDirections, addMarker];
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
