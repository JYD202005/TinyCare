import React, { createContext, useContext, ReactNode } from 'react'
import { Database } from '@nozbe/watermelondb'
import { database } from './index'

const DatabaseContext = createContext<Database>(database)

export const DatabaseProvider = ({ children }: { children: ReactNode }) => (
  <DatabaseContext.Provider value={database}>
    {children}
  </DatabaseContext.Provider>
)

export const useDatabase = () => useContext(DatabaseContext)
