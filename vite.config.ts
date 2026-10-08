import { defineConfig } from 'vite';

export default defineConfig({
    server: {
	proxy: {
	    '/geocode': {
		target: 'https://geocoding.geo.census.gov',
		changeOrigin: true,
		rewrite: (path) => path.replace(/^\/geocode/, ''),
	    },
	},
    },
});
