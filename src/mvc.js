jstack.mvc = function(config){
	
	if(typeof(arguments[0])=='string'){
		config = {
			view: arguments[0],
			controller: typeof(arguments[1])=='string'?arguments[1]:arguments[0]
		};
	}
	
	if(!config.controller){
		config.controller = config.view;
	}
	if(!config.target){
		config.target = jstack.config.defaultTarget;
	}
	
	var target = $(config.target);
	var controller = config.controller;
	
	var controllerPath = jstack.config.controllersPath+config.controller;
	
	var controllerReady = $.Deferred();
	var processor;
	
	if(jstack.controllers[config.controller]){
		controllerReady.resolve();
	}
	else{
		$js.onExists(controllerPath,controllerReady.resolve,controllerReady.resolve);
	}
	var viewReady = jstack.getTemplate(config.view+'.jml');
	
	var ready = $.Deferred();
	
	controllerReady.then(function(){
		
		var ctrl = jstack.controller(config.controller,target);
		
		$.when(viewReady, ctrl.ready).then(function(view){
			var html = view[0];
			ctrl.render(html);
			ready.resolve(target,ctrl);
		});		
		
	});

	return ready;
};
jstack.viewReady = function(el){
	if(typeof(arguments[0])=='string'){
		var selector = '[j-view="'+arguments[0]+'"]';
		if(typeof(arguments[1])=='object'){
			el = $(arguments[1]).find(selector);
		}
		else{
			el = $(selector);
		}
	}
	
	el = $(el);
	var ready = el.data('jViewReady');
	if(!ready){
		ready = $.Deferred();
		el.data('jViewReady',ready);
	}
	return ready;
};
$.on('j:load','[j-view]:not([j-view-loaded])',function(){
	
	this.setAttribute('j-view-loaded','true');
	
	var view = this.getAttribute('j-view');
	
	var controller;
	if(this.hasAttribute('j-controller')){
		controller = this.getAttribute('j-controller');
	}
	else{
		controller = view;
	}

	var ready = jstack.viewReady(this);
	var mvc = jstack.mvc({
		view:view,
		controller:controller,
		target:this,
	});
	mvc.then(function(){
		setTimeout(function(){
			ready.resolve();
		},0);
	});
});