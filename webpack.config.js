const path = require('path');

module.exports = {
	mode: 'development', // Set the build mode to 'development'
	entry: './src/index.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader', // Use Babel loader for .js and .jsx files
				},
			},
		],
	},
	devServer: {
		static: path.join(__dirname, 'dist'),
		hot: true,
	},
};
