import { useMemo } from 'react';
import { Mail, Calendar, BookOpen, Heart, Briefcase } from 'lucide-react';
import { useFamily } from '../data/FamilyContext';
import { getDaysUntilBirthday, getAge, formatDate, daysSince, formatRelativeDate } from '../utils/dates';
import Card from '../components/Card';
import Badge from '../components/Badge';
import './Digest.css';

export default function Digest() {
  const { persons, events, journalEntries, memoryRecordings } = useFamily();

  const digest = useMemo(() => {
    const now = new Date();

    // Birthdays this week
    const birthdays = persons
      .filter(p => p.dob && p.id !== 'p1')
      .map(p => ({ person: p, daysUntil: getDaysUntilBirthday(p.dob) }))
      .filter(b => b.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // Events this week
    const weekEvents = events
      .filter(e => {
        const d = new Date(e.date);
        const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recent journal entries (last 7 days)
    const recentJournal = journalEntries
      .filter(j => daysSince(j.date) <= 7)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Reconnect nudges
    const reconnect = persons
      .filter(p => p.id !== 'p1' && !p.isGrandchild && daysSince(p.lastContactDate) >= 14)
      .sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate));

    return { birthdays, weekEvents, recentJournal, reconnect };
  }, [persons, events, journalEntries]);

  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (7 - today.getDay()) % 7);

  return (
    <div className="digest">
      <div className="digest-header">
        <h2>Sunday Summary</h2>
        <p className="digest-subtitle">
          Week of {formatDate(today)}
        </p>
      </div>

      <div className="digest-preview">
        <Card className="digest-card">
          {/* Birthdays */}
          {digest.birthdays.length > 0 && (
            <section className="digest-section">
              <div className="digest-section-header">
                <Calendar size={16} />
                <h3>Birthdays This Week</h3>
              </div>
              {digest.birthdays.map(({ person, daysUntil }) => (
                <div key={person.id} className="digest-item">
                  <span className="digest-item-text">
                    <strong>{person.name}</strong> turns {getAge(person.dob) + (daysUntil === 0 ? 0 : 1)}
                  </span>
                  <Badge variant="birthday">
                    {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                  </Badge>
                </div>
              ))}
            </section>
          )}

          {/* Events */}
          {digest.weekEvents.length > 0 && (
            <section className="digest-section">
              <div className="digest-section-header">
                <Briefcase size={16} />
                <h3>Events & Schedule</h3>
              </div>
              {digest.weekEvents.map(event => (
                <div key={event.id} className="digest-item">
                  <span className="digest-item-text">{event.title}</span>
                  <span className="digest-item-date">{formatDate(event.date)}</span>
                </div>
              ))}
            </section>
          )}

          {/* Recent Journal */}
          {digest.recentJournal.length > 0 && (
            <section className="digest-section">
              <div className="digest-section-header">
                <BookOpen size={16} />
                <h3>Journal Updates</h3>
              </div>
              {digest.recentJournal.map(entry => {
                const child = persons.find(p => p.id === entry.childId);
                return (
                  <div key={entry.id} className="digest-item">
                    <span className="digest-item-text">
                      <strong>{child?.name}</strong>: {entry.content.slice(0, 80)}
                      {entry.content.length > 80 && '...'}
                    </span>
                  </div>
                );
              })}
            </section>
          )}

          {/* Reconnect */}
          {digest.reconnect.length > 0 && (
            <section className="digest-section">
              <div className="digest-section-header">
                <Heart size={16} />
                <h3>Reconnect</h3>
              </div>
              {digest.reconnect.map(person => (
                <div key={person.id} className="digest-item">
                  <span className="digest-item-text">
                    <strong>{person.name}</strong> — last contact {formatRelativeDate(person.lastContactDate)}
                  </span>
                </div>
              ))}
            </section>
          )}

          {digest.birthdays.length === 0 &&
           digest.weekEvents.length === 0 &&
           digest.recentJournal.length === 0 &&
           digest.reconnect.length === 0 && (
            <div className="digest-empty">
              <Mail size={32} strokeWidth={1} />
              <p>Nothing to report this week. A quiet week!</p>
            </div>
          )}
        </Card>

        <p className="digest-note">
          This is a preview of the weekly digest. In a future update, this will be sent automatically every Sunday via email or WhatsApp.
        </p>
      </div>
    </div>
  );
}
