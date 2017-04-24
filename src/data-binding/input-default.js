(function(){

const inputPseudoNodeNamesExtended = {input:1 ,select:1, textarea:1, button:1, 'j-input':1, 'j-select':1};
const inputPseudoNodeNames = {input:1 ,select:1, textarea:1};

jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('name')&&inputPseudoNodeNamesExtended[n.tagName.toLowerCase()]&&n.type!='file';
	},
	callback(el,dataBinder,scope){
		
		let $el = $(el);

		let tagName = el.tagName.toLowerCase();
		if(tagName=='select'||tagName=='j-select'){
			$el.contents().each(function(){
				dataBinder.compileDom(this, scope);
			});
		}
		
		let currentData;

		//default to model					
		let key = jstack.dataBinder.getScopedInput(el);
		let val = jstack.dataBinder.getInputVal(el);
		
		let modelValue = jstack.dotSet(dataBinder.model,key,val,true);
		
		if(!modelValue){
			modelValue = '';
		}
		
		
		//model to default dom value
		if(modelValue!==val){
			let nodeName = el.tagName.toLowerCase();
			if(nodeName=='select'){
				let found;
				$el.find('option').each(function(){
					if(this.hasAttribute('value')){
						if(this.value==modelValue){
							found = true;
							return false;
						}
					}
					else{
						if($(this).text()==modelValue){
							found = true;
							return false;
						}
					}
				});
				if(found){
					$el.populateInput(modelValue,{preventValEvent:true});
				}
				else{
					jstack.dotSet(dataBinder.model,key,val);
				}
			}
			else{
				$el.populateInput(modelValue,{preventValEvent:true});
			}
		}
	},
});


})();
