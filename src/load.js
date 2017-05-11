(function(){

let getViewReady = function(el){
	el = $(el);
	let ready = el.data('jViewReady');
	if(!ready){
		ready = $.Deferred();
		el.data('jViewReady',ready);
	}
	return ready;
};

jstack.load = function(target,config,options){
	
	if(typeof(config)=='string'){
		config = {
			component: config,
		};
	}
	
	const jsReady = $.Deferred();
	if(typeof(config.component)=='string'){
		let componentUrl = jstack.config.controllersPath+config.component;
		if(jstack.componentRegistry[config.component]){
			
			jsReady.resolve( jstack.componentRegistry[config.component] );
			
		}
		else{
		
			requirejs( [ componentUrl ], function( module ){
				jsReady.resolve( module );
			});
			
		}
	}
	else{
		jsReady.resolve( config.component );
	}
	
	
	const ready = getViewReady(target);
	
	jsReady.then(function(componentClass){

		if(config.clear){
			$(config.clear).contents().not(target).remove();
		}
		
		let component = jstack.Component.factory(componentClass, target, (options || {}), {
			route : config.route,
		});
		component.ready.then(function(){
			ready.resolve(target,component);
		});

	});

	return ready.promise();
};
jstack.viewReady = function(el){
	return getViewReady(el).promise();
};

})();
