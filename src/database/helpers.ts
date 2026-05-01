import { database } from './index'
import { Perfil } from './models'

// Ejemplo de cómo crear un perfil
export const createPerfil = async (nombre: string, idUsuarioRemote: string) => {
  return await database.write(async () => {
    return await database.get<Perfil>('perfiles').create((perfil) => {
      perfil.nombreIdentificador = nombre
      perfil.idUsuarioRemote = idUsuarioRemote
      perfil.createdAt = Date.now()
      perfil.updatedAt = Date.now()
    })
  })
}

// Ejemplo de cómo obtener todos los perfiles
export const getPerfiles = async () => {
  return await database.get<Perfil>('perfiles').query().fetch()
}

// Ejemplo de cómo observar los perfiles (para React)
export const observePerfiles = () => {
  return database.get<Perfil>('perfiles').query().observe()
}
