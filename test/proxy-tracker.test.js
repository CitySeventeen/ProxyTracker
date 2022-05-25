/* global Promise, describe, it, __dirname, process, Reflect*/
const {expect, assert} = require('chai');
const util = require('util');

const ambiente = process.env.NODE_ENV;

const {ProxyExtension, ProxyTracker} = require(`../proxy-tracker.js`);

const t = {};
Object.freeze(t);

describe('ProxyTracker - errori argomenti errati', () => { // la maggior parte di questtest (che sono skip) li faccio quando integro la possibilità di inere anche callbackss sena bisgono di metterle in oun oggetto}
  let classe;
  beforeEach(()=>{
    classe = class{
      constructor(arg){this.argomenti = arg; this.constr = 5;}
      met1(){this.uno = 1; return 'called';}
      met2(arg){this.due = arg; return 'called';}
    };
  });
  const handler_corretto = {get: function(){}};
  it('ProxyTracker(target, nulla) -> no errore', () => {
    expect(()=>{new ProxyTracker(classe);}).to.not.throw();

  });
  it('ProxyTracker(target, undefined) -> no errore', () => {
    expect(()=>{new ProxyTracker(classe, undefined);}).to.not.throw();
  });
  it('ProxyTracker(target, undefined, {}) -> no errore', () => {
    expect(()=>{new ProxyTracker(classe, undefined, {});}).to.not.throw();
  });
  it('ProxyTracker(target, undefined, handler_corretto) -> no errore', () => {
    expect(()=>{new ProxyTracker(classe, undefined, handler_corretto);}).to.not.throw();
  });
  it('ProxyTracker(target, handler_corretto, {}) -> no errore', () => {
    expect(()=>{new ProxyTracker(classe, handler_corretto, undefined);}).to.not.throw();
  });
  it('ProxyTracker(target, {}) -> no errore ', () => {
    expect(()=>{new ProxyTracker(classe, handler_corretto, undefined);}).to.not.throw();
  });
  it('ProxyTracker(target, {any_trap: undefined}), ovvero senza callback definite -> no errore ', () => {
    expect(()=>{new ProxyTracker(classe, {construct: undefined});}).to.not.throw();
  });
  
  it('ProxyTracker(target, valore diverso da object) -> errore', () => {
    for(let handler_errato of [5, 0, -8, 'stringa', function Construct(){}, [1,2,3], false, true, [function Construct(){}]])
      expect(()=>{new ProxyTracker(classe, handler_errato);}).to.throw(TypeError, 'handler deve essere un oggetto');
  });
  it('ProxyTracker(target, {callback anonima -> non esiste cb anonima, ma si chiama function } -> errore perché nome non appartiene a nome trappole', () => {
    expect(()=>{new ProxyTracker(classe, {function(){}});}).to.throw('La trappola non è del tipo previsto da Proxy');
  });
});
describe('inserimento delle callback', () => {
  let bridge;
  function cb1(...args){bridge.push(`callback cb1 chiamata`);}
  function cb2(...args){bridge.push(`callback cb2 chiamata`);}
  function cb3(...args){bridge.push(`callback cb3 chiamata`);}
  const cbs = {cb1, cb2, cb3};
  
  beforeEach(()=>{
    bridge = [];
  });
  
  describe('combinazione di handler', () => {
    let classe;
    beforeEach(()=>{
      classe = class{
        constructor(arg){this.argomenti = arg; this.constr = 5; this.obj = {};}
        met1(){this.uno = 1; return 'called';}
        met2(arg){this.due = arg; return 'called';}
        static met3(){}
      };
    });
    it('handler = {construct: {get: {apply}}} inserisce la callback in apply e non in construct o get', () => {
      const handler = {construct: {get: {apply: cb1}}};

      const {generaHandlerForProxyTrack} = require(`../proxy-tracker.js`).test;
      let track = new ProxyTracker(classe, handler);

      let istanza = new track(5);
      expect(bridge).to.be.an('array').that.not.include(`callback cb1 chiamata`);
      istanza.met1;
      expect(bridge).to.be.an('array').that.not.include(`callback cb1 chiamata`);
      istanza.met1();
      expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);

    });
    it('handler = {construct: callback}, {get: callback} inserisce la callback in construct, e in get, ma non in apply', () => {
      const handler1 = {construct: cb1};
      const handler2 = {get: cb2};
      let track = new ProxyTracker(classe, handler1, handler2);

      track.met3;
      expect(bridge).to.be.an('array').that.include(`callback cb2 chiamata`);
      let istanza = new track(5);
      expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
    });
    it('inserisce 2 callback in construct, e una in get->apply', () => {
      const handler = [{construct: [cb1, cb3]},
                       {construct: {get: {apply: cb2}}}];
      let track = new ProxyTracker(classe, ...handler);

      track.met3;
      expect(bridge).to.eql([]);
      let istanza = new track(5);
      expect(bridge).to.eql([`callback cb1 chiamata`, `callback cb3 chiamata`]);
      expect(istanza.obj).to.satisfy((val)=>util.types.isProxy(val));
      expect(bridge).to.eql([`callback cb1 chiamata`, `callback cb3 chiamata`]);
      expect(istanza.met1).to.satisfy((val)=>util.types.isProxy(val));
      expect(bridge).to.eql([`callback cb1 chiamata`, `callback cb3 chiamata`]);
      expect(istanza.met1(1,2)).to.eql('called');
      expect(bridge).to.eql([`callback cb1 chiamata`, `callback cb3 chiamata`, `callback cb2 chiamata`]);
      expect(istanza.met1(1,2)).to.satisfy((val)=>!util.types.isProxy(val));
    });
  });
  
  for(let test of [{title: 'trap doesnt return proxy, but real value', flag: false}]){
    describe(`in classe with ${test.title}`, ()=>{
      class classe{
        static paramstatic = 8;
        constructor(arg){this.argomenti = arg; this.constr = 5; this.obj = {};}
        met1(){this.uno = 1; return 'called';}
        met2(arg){this.due = arg; return 'called';}
        static met3(){}
        static oggetto = {}
      }
      const testTrap = new testTrapGenerator(classe, test.flag);

      for(let trap of   ['construct', 'get', 'defineProperty', 'deleteProperty',
                        'getOwnPropertyDescriptor', 'getPrototypeOf', 'has',
                        'isExtensible', 'ownKeys', 'preventExtensions', 'set',
                        'setPrototypeOf'])
      {
         testTrap[trap]();                             
      }
    });
    describe(`in classe derivata with ${test.title}`, () => {
      class base{
        constructor(arg){this.base = arg;}
      }
      class derivata extends base{
        constructor(arg){super(arg); this.derivata = arg + 100;}
        metodo_derivata(){this.metodo = 8; return 'qualcosa';}
        static oggetto = {}
      }
      const testTrap = new testTrapGenerator(derivata, test.flag);

      for(let trap of   ['construct', 'get', 'defineProperty', 'deleteProperty',
                        'getOwnPropertyDescriptor', 'getPrototypeOf', 'has',
                        'isExtensible', 'ownKeys', 'preventExtensions', 'set',
                        'setPrototypeOf'])
      {
         testTrap[trap]();                             
      }
    });

    describe(`in oggetto with ${test.title}`, ()=>{
      const object = {param: 5, metodo(){return 8;}, oggetto: {}};
      const testTrap = new testTrapGenerator(object, test.flag);

      for(let trap of   ['get', 'defineProperty', 'deleteProperty',
                        'getOwnPropertyDescriptor', 'getPrototypeOf', 'has',
                        'isExtensible', 'ownKeys', 'preventExtensions', 'set',
                        'setPrototypeOf'])
      {
         testTrap[trap]();                             
      }
    });
    describe(`in funzione with ${test.title}`, ()=>{
      const funzione = function(){};
      const testTrap = new testTrapGenerator(funzione, test.flag);

      for(let trap of   ['construct', 'apply', 'get', 'defineProperty', 'deleteProperty',
                        'getOwnPropertyDescriptor', 'getPrototypeOf', 'has',
                        'isExtensible', 'ownKeys', 'preventExtensions', 'set',
                        'setPrototypeOf'])
      {
         testTrap[trap]();                             
      }
    });
    describe(`in array with ${test.title}`, ()=>{
      const array = [];
      const testTrap = new testTrapGenerator(array, test.flag);

      for(let trap of   ['get', 'defineProperty', 'deleteProperty',
                        'getOwnPropertyDescriptor', 'getPrototypeOf', 'has',
                        'isExtensible', 'ownKeys', 'preventExtensions', 'set',
                        'setPrototypeOf'])
      {
         testTrap[trap]();                             
      }
    });
  }
  function testTrapGenerator(entita, value_returned_is_proxy){
    const any_trap = 'get';
    const forceToReturnProxy = function(from_trap){
      const handler = {};
      if(value_returned_is_proxy){
        const handler_for_forcing_returning_proxy_from_trap = {};
        handler_for_forcing_returning_proxy_from_trap[any_trap] = function(){};
        handler[from_trap] = handler_for_forcing_returning_proxy_from_trap;
      }
      return handler;
    };
    const doesSureReturnedIsProxy = function(value, entita){
      console.dir(value);
      console.dir(typeof entita);
      assert(util.types.isProxy(value), 'error in test. The value returned must be a proxy');
    };
    this.apply = function(){
      it('handler = {apply: callback} inserisce la callback in apply', () => {
        const handler = {apply: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('apply'));
        let value = track();
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
    };
    this.construct = function(){
      it('handler = {construct: callback} inserisce la callback in construct', () => {
        const handler = {construct: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('construct'));
        let value = new track(5);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
    };
    this.defineProperty = function(){
      it('handler = {defineProperty: callback} inserisce la callback in defineProperty', () => {
        const handler = {defineProperty: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('defineProperty'));
        track.new_prop = 'valore';
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
      it('handler = {defineProperty: callback} inserisce la callback in defineProperty', () => {
        const handler = {defineProperty: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('defineProperty'));
        let value = Object.defineProperty(track, 'new_prop', {value: 8});
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
    };
    this.deleteProperty = function(){
      it('handler = {deleteProperty: callback} inserisce la callback in deleteProperty', () => {
        const handler = {deleteProperty: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('deleteProperty'));
        Reflect.deleteProperty(track, 'prop');
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
      it('handler = {deleteProperty: callback} inserisce la callback in deleteProperty', () => {
        const handler = {deleteProperty: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('deleteProperty'));
        delete track.parametro;
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
    };
    this.get = function(){
      it('handler = {get: callback} inserisce la callback in get', () => {
        const handler = {get: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('get'));
        track.parametro;
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        let value = track.oggetto;
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
    };
    this.getOwnPropertyDescriptor = function(){
      it('handler = {getOwnPropertyDescriptor: callback} inserisce la callback in getOwnPropertyDescriptor', () => {
        const handler = {getOwnPropertyDescriptor: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('getOwnPropertyDescriptor'));
        let value = Object.getOwnPropertyDescriptor(track, 'oggetto');
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
    };
    this.getPrototypeOf = function(){
      it('handler = {getPrototypeOf: callback} inserisce la callback in getPrototypeOf', () => {
        const handler = {getPrototypeOf: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('getPrototypeOf'));
        let value = Object.getPrototypeOf(track);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
      it('handler = {getPrototypeOf: callback} inserisce la callback in getPrototypeOf', () => {
        const handler = {getPrototypeOf: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('getPrototypeOf'));
        track instanceof Object;
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
    };
    this.has = function(){
      it('handler = {has: callback} inserisce la callback in has', () => {
        const handler = {has: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('has'));
        'param' in track;
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
      it('handler = {has: callback} inserisce la callback in has', () => {
        const handler = {has: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('has'));
        Reflect.has(track, 'param');
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
    };
    this.isExtensible = function(){
      it('handler = {isExtensible: callback} inserisce la callback in isExtensible', () => {
        const handler = {isExtensible: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('isExtensible'));
        Object.isExtensible(track);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
    };
    this.ownKeys = function(){
      it('handler = {ownKeys: callback} inserisce la callback in ownKeys', () => {
        const handler = {ownKeys: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('ownKeys'));
        let value = Object.keys(track);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
      it('handler = {ownKeys: callback} inserisce la callback in ownKeys', () => {
        const handler = {ownKeys: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('ownKeys'));
        let value = Object.getOwnPropertyNames(track);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
    };
    this.preventExtensions = function(){
      it('handler = {preventExtensions: callback} inserisce la callback in preventExtensions', () => {
        const handler = {preventExtensions: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('preventExtensions'));
        let value = Object.seal(track);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
      it('handler = {preventExtensions: callback} inserisce la callback in preventExtensions', () => {
        const handler = {preventExtensions: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('preventExtensions'));
        let value = Object.freeze(track);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
      it('handler = {preventExtensions: callback} inserisce la callback in preventExtensions', () => {
        const handler = {preventExtensions: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('preventExtensions'));
        let value = Object.preventExtensions(track);
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
        if(value_returned_is_proxy) doesSureReturnedIsProxy(value, entita);
      });
    };
    this.set = function(){
      it('handler = {set: callback} inserisce la callback in set', () => {
        const handler = {set: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('set'));
        track.parametro = 8;
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
    };
    this.setPrototypeOf = function(){
      it('handler = {setPrototypeOf: callback} inserisce la callback in setPrototypeOf', () => {
        const handler = {setPrototypeOf: cbs.cb1};
        let track = new ProxyTracker(entita, handler, forceToReturnProxy('setPrototypeOf'));
        Reflect.setPrototypeOf(track, {});
        expect(bridge).to.be.an('array').that.include(`callback cb1 chiamata`);
      });
    };
    
  };
});


