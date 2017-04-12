jstack.dataBindingElementCompiler.jInclude = {
	match(n){	
		return n.hasAttribute('j-include');
	},
	callback(n,dataBinder,scope){
		let include = n.getAttribute('j-include');
		n.removeAttribute('j-include');
		$(n).empty();
		let c = dataBinder.templates[include].clone().contents();
		c.appendTo(n);
		dataBinder.compileDom(n,scope);
		return false;
	},
};
