export default {
  findIndexById(array,id) {
    for (let i in array) {
      if (array[i]._id === id) {
        return i
      }
    }
    return -1
  },

  findObjectById: (array,id) => {
    for (let i of array) {
      if (i._id === id) {
        return i
      }
    }
    return undefined
  },

  findObjectByKey(array,key,value) {
    for (let i of array) {
      if (i[key] === value) {
        return i
      }
    }
    return undefined
  },

  stringifyIds(obj) {
    return JSON.parse(JSON.stringify(obj))
  },

  isAsync(fn) {
   return fn.constructor.name === 'AsyncFunction';
  },

  // TODO Buffer picture => file
  async savePicture({buffer, path, fileName}) {},
}
