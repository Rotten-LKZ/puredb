
import fs from 'fs'

/**
 * Deep proxy
 * @param obj the object you need to use proxy
 * @param cb callback
 * @returns Proxy
 */
function deepProxy<T extends object>(obj: T, cb: Function) {
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (typeof obj[key] === 'object')
        // @ts-expect-error - no wrong
        obj[key] = deepProxy(obj[key], cb)
    }
  }

  return new Proxy(obj, {
    set(target, props, value, receiver) {
      if (typeof value === 'object')
        value = deepProxy(value, cb)

      return cb(target, props, value, receiver)
    },
  })
}

/**
 * The options type for classes
 */
interface Options {
  /** whether need to update the JSON file after changes **/
  realtimeUpdate?: boolean
}

export default class ConciseDb<T extends object> {
  private readonly filePath: string
  private readonly options: Options
  private _data: T
  public data: T

  /**
   * Init this class
   * @param filePath the path of the JSON file
   * @param defaultData the default data of the JSON file
   * @param options Some options of this class
   */
  constructor(filePath: string, defaultData?: T, options?: Options) {
    this.filePath = filePath
    this.options = options || {}
    if (defaultData !== undefined && typeof defaultData !== 'object')
      throw new Error('data is not an object')
    const _con = this.getFileContentSync()
    if (_con === false) {
      // There is no file
      if (defaultData === undefined)
        throw new Error('data is not defined')
      else
        this._data = defaultData
      this.write(defaultData)
    }
    else {
      // There is a JSON file
      if (defaultData !== undefined)
        // Notice: the data here will be changed when this._data change because of Object.assign
        // So I recommend not to use data
        this._data = this.calcDiff(defaultData, _con)
      else
        this._data = _con
    }
    this.data = deepProxy<T>(this._data, this.dataSet.bind(this))
  }

  /**
   * To get the content of the JSON file
   * @returns data or false
   */
  private getFileContentSync(): T | false {
    if (!fs.existsSync(this.filePath))
      return false
    const _con = JSON.parse(fs.readFileSync(this.filePath, { encoding: 'utf-8' }))
    if (typeof _con !== 'object')
      throw new Error('file content is not an object')
    return _con
  }

  /**
   * This function will run when the data update
   * @returns boolean
   */
  private dataSet(target: T, props: string | symbol, value: any, receiver: any): boolean {
    Reflect.set(target, props, value, receiver)
    if (this.options.realtimeUpdate === true)
      this.write(this.data)
    return true
  }

  /**
   * To write data to the JSON file
   * @param data data to be written
   */
  private write(data: T) {
    fs.writeFileSync(this.filePath, JSON.stringify(data))
  }

  /**
   * To calculate the differences between the current data (saved in the JSON file) and the new data (user input)
   * @param data User input data
   */
  private calcDiff(data: T, fileContent: T) {
    const res = Object.assign(data, fileContent)
    this.write(res)
    return res
  }

  /**
   * To get a copy of data
   * @returns a copy of data
   */
  public getData(): T {
    return JSON.parse(JSON.stringify(this._data))
  }

  /**
   * To update the JSON file manually
   */
  public updateFile() {
    this.write(this._data)
  }
}

export { Options }
