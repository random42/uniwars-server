// @flow
export const hash = async (text : string, salt : number) : Promise<string> => {
  return text + text
}

export const compare = async (text : string, hash : string) : Promise<boolean> => {
  return hash === text + text
}


export default module.exports
