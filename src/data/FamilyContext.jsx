import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadData, saveData } from '../utils/storage';
import { seedData } from './seed';

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const [data, setData] = useState(() => {
    const stored = loadData();
    return stored || seedData;
  });

  useEffect(() => {
    saveData(data);
  }, [data]);

  const updateData = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...next };
    });
  }, []);

  const getPerson = useCallback((id) => {
    return data.persons.find(p => p.id === id);
  }, [data.persons]);

  const getHousehold = useCallback((id) => {
    return data.households.find(h => h.id === id);
  }, [data.households]);

  const getPersonsByHousehold = useCallback((householdId) => {
    return data.persons.filter(p => p.householdId === householdId);
  }, [data.persons]);

  const getGrandchildren = useCallback(() => {
    return data.persons.filter(p => p.isGrandchild);
  }, [data.persons]);

  const getJournalForChild = useCallback((childId) => {
    return data.journalEntries
      .filter(j => j.childId === childId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.journalEntries]);

  const addJournalEntry = useCallback((entry) => {
    const id = 'j' + Date.now();
    updateData(prev => ({
      journalEntries: [...prev.journalEntries, { ...entry, id, date: entry.date || new Date().toISOString().slice(0, 10) }],
    }));
  }, [updateData]);

  const addContactLog = useCallback((log) => {
    const id = 'c' + Date.now();
    const date = log.date || new Date().toISOString().slice(0, 10);
    updateData(prev => ({
      contactLogs: [...prev.contactLogs, { ...log, id, date }],
      persons: prev.persons.map(p =>
        p.id === log.personId ? { ...p, lastContactDate: date } : p
      ),
    }));
  }, [updateData]);

  const addMemoryRecording = useCallback((recording) => {
    const id = 'm' + Date.now();
    updateData(prev => ({
      memoryRecordings: [...prev.memoryRecordings, { ...recording, id, date: recording.date || new Date().toISOString().slice(0, 10) }],
    }));
  }, [updateData]);

  const addEvent = useCallback((event) => {
    const id = 'e' + Date.now();
    updateData(prev => ({
      events: [...prev.events, { ...event, id }],
    }));
  }, [updateData]);

  const addPerson = useCallback((person) => {
    const id = 'p' + Date.now();
    updateData(prev => ({
      persons: [...prev.persons, { ...person, id }],
    }));
    return 'p' + Date.now();
  }, [updateData]);

  const updatePerson = useCallback((id, updates) => {
    updateData(prev => ({
      persons: prev.persons.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, [updateData]);

  const addCorkPin = useCallback((pin) => {
    const id = 'cp' + Date.now();
    updateData(prev => ({
      corkPins: [...(prev.corkPins || []), { ...pin, id }],
    }));
  }, [updateData]);

  const removeFromWall = useCallback((id) => {
    updateData(prev => ({
      corkPins: (prev.corkPins || []).map(p => p.id === id ? { ...p, removed: true } : p),
    }));
  }, [updateData]);

  const value = {
    ...data,
    getPerson,
    getHousehold,
    getPersonsByHousehold,
    getGrandchildren,
    getJournalForChild,
    addJournalEntry,
    addContactLog,
    addMemoryRecording,
    addEvent,
    addPerson,
    updatePerson,
    addCorkPin,
    removeFromWall,
    updateData,
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
}
