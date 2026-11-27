import { agendaOwnerColor, agendaOwnerLabel } from './agenda-owner.util';

describe('agenda owner presentation', () => {
  it('uses at most the first five characters before the at sign', () => {
    expect(agendaOwnerLabel('mariana@gmail.com')).toBe('maria');
    expect(agendaOwnerLabel('leo@example.com')).toBe('leo');
  });

  it('keeps a stable color for each user id', () => {
    expect(agendaOwnerColor('user-a')).toBe(agendaOwnerColor('user-a'));
    expect(agendaOwnerColor('user-a')).not.toBe(agendaOwnerColor('user-b'));
  });
});
