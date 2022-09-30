export const merge = function(def, opt) {
  for(let key in opt) {
    // eslint-disable-next-line no-prototype-builtins
    if (opt.hasOwnProperty(key)) {
      def[key] = opt[key]
    }
  }

  return def
}

//  创建xml元素
export const createSvgEl = (name, attrs) => {
  let ns = 'http://www.w3.org/2000/svg'
  let el = document.createElementNS(ns, name)
  const { style = {}, ...reset } = attrs
  const keys = Object.keys(reset)
  const styleKeys = Object.keys(style)
  
  if (styleKeys.length) {
    let str = ''
    for(const key of styleKeys) {
      const value = style[key]

      if (value) {
        str += `${key}:${value};`
      }
    }

    el.setAttribute('style', str)
  }

  for(const key of keys) {
    const value = reset[key]
    
    if (value) {
      el.setAttribute(key, value)
    }
  }

  return el
}

//  事件绑定兼容
export const addHandle = (dom, type, fn) => {
  if (!dom) {
    return
  }

  if (document.addEventListener) {
    dom.addEventListener(type, fn, false)
  } else if (document.attachEvent) {
    dom.attachEvent('on' + type, fn)
  } else {
    let oldDomFun = dom['on' + type]
    dom['on' + type] = function() {
      oldDomFun()
      fn && fn()
    }
  }
}

//  事件解绑
export const removeHandle = (dom, type, fn) => {
  if (!dom) {
    return
  }
  
  if (document.removeEventListener) {
    dom.removeEventListener(type, fn)
  } else if (document.detachEvent) {
    dom.detachEvent('on' + type, fn)
  } else {
    dom['on' + type] = null
  }
}

export const deepClone = (source, dest) => {
  if (!source && typeof source !== 'object') {
    throw new Error('error arguments', 'shallowClone')
  }
  dest = dest || (Array.isArray(source) ? [] : {})
  for (const key in source) {
    // eslint-disable-next-line no-prototype-builtins
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object') {
        dest[key] = Array.isArray(source[key]) ? [] : {}
        deepClone(source[key], dest[key])
      } else {
        dest[key] = source[key]
      }
    }
  }
  
  return dest
}