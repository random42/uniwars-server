import { DB } from '../../build_flow/db'
import { User } from '../../build_flow/models'
import _ from 'lodash'
import monk from 'monk'
import DATA from '../../data'
import * as sec from '../../build_flow/security'
// two random users
let [ A, B ] = DATA.USERS

test.skip('security', async () => {
  const obj = {
    type: 'student',
    username : 'asdf',
    email: 'asd@asd.com',
    password: 'Mammamia123'
  }
  const user = await User.create(obj)
  const right = await sec.crypto.compare(obj.password, user.password)
  expect(right).toBe(true)
  // username login
  let login = await sec.localLogin(obj.username, obj.password)
  expect(login).toBeDefined()
  // email login
  login = await sec.localLogin(obj.email, obj.password)
  expect(login).toBeDefined()
  // wrong password
  let wrongLogin = sec.localLogin(obj.username, 'asdasd')
  await expect(wrongLogin).rejects.toThrow("Invalid password")
  wrongLogin = sec.localLogin('mamma', obj.password)
  await expect(wrongLogin).rejects.toThrow("Invalid user")
})
