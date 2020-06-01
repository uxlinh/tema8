import { readable } from 'svelte/store';

//husk export const time
export const time = readable(null, set => {
	set(new Date());

	const interval = setInterval(() => { set(new Date());
	}, 1000);

	return () => clearInterval(interval);
});