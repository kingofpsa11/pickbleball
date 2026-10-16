import type { Group, Match, Player, SetScore, StoreData, Team, Tournament } from '../types.ts'

const standardRanking = ['points', 'matchDiff', 'pointDiff', 'h2h'] as const

function player(id: string, tournamentId: string, name: string): Player {
  return { id, tournamentId, name }
}

function team(id: string, tournamentId: string, name: string, playerIds: string[]): Team {
  return { id, tournamentId, name, playerIds }
}

function group(id: string, tournamentId: string, name: string, teamIds: string[]): Group {
  return { id, tournamentId, name, teamIds }
}

function played(
  id: string,
  tournamentId: string,
  groupId: string,
  court: string,
  scheduledAt: string,
  teamA: string,
  teamB: string,
  sets: SetScore[],
  status: Match['status'],
): Match {
  return {
    id,
    tournamentId,
    stage: 'group',
    roundLabel: 'Vòng bảng',
    groupId,
    court,
    scheduledAt,
    slotA: { kind: 'team', teamId: teamA },
    slotB: { kind: 'team', teamId: teamB },
    sets,
    status,
  }
}

function waiting(
  id: string,
  tournamentId: string,
  groupId: string,
  court: string,
  scheduledAt: string,
  teamA: string,
  teamB: string,
): Match {
  return played(id, tournamentId, groupId, court, scheduledAt, teamA, teamB, [], 'scheduled')
}

const hn: Tournament = {
  id: 't-hn',
  name: 'Giải nội bộ Hà Nội 2026',
  venue: 'Nhà thi đấu Tây Hồ',
  city: 'Hà Nội',
  startDate: '2026-10-15',
  endDate: '2026-10-16',
  status: 'live',
  category: 'Đôi nam',
  description:
    'Dành cho thành viên nội bộ. Ban tổ chức nhập tên từng người. Tám đôi nam, hai bảng. Thắng 2 điểm, thua 1 điểm, bỏ cuộc 0 điểm.',
  config: {
    setsToWin: 1,
    pointsForWin: 2,
    pointsForLoss: 1,
    pointsForForfeit: 0,
    pointsPerSet: 11,
    ranking: [...standardRanking],
  },
}

const dn: Tournament = {
  id: 't-dn',
  name: 'Giải nội bộ Đà Nẵng',
  venue: 'Cung thể thao Tiên Sơn',
  city: 'Đà Nẵng',
  startDate: '2026-10-02',
  endDate: '2026-10-03',
  status: 'finished',
  category: 'Đôi nữ',
  description:
    'Dành cho thành viên nội bộ. Ban tổ chức nhập tên từng người. Bốn đôi nữ đánh vòng tròn. Thắng 2 điểm, thua 1 điểm, bỏ cuộc 0 điểm.',
  config: {
    setsToWin: 1,
    pointsForWin: 2,
    pointsForLoss: 1,
    pointsForForfeit: 0,
    pointsPerSet: 11,
    ranking: [...standardRanking],
  },
}

const sg: Tournament = {
  id: 't-sg',
  name: 'Giải nội bộ Sài Gòn',
  venue: 'Nhà thi đấu Phú Thọ',
  city: 'TP. Hồ Chí Minh',
  startDate: '2026-11-22',
  endDate: '2026-11-23',
  status: 'upcoming',
  category: 'Đôi nam',
  description: 'Dành cho thành viên nội bộ. Ban tổ chức nhập tên từng người. Bốn đôi nam, lịch đã xếp, chưa thi đấu.',
  config: {
    setsToWin: 1,
    pointsForWin: 2,
    pointsForLoss: 1,
    pointsForForfeit: 0,
    pointsPerSet: 11,
    ranking: [...standardRanking],
  },
}

export const SEED: StoreData = {
  version: 5,
  tournaments: [hn, dn, sg],
  players: [
    player('p-th-1', 't-hn', 'Minh Khoa'),
    player('p-th-2', 't-hn', 'Tuấn Anh'),
    player('p-cg-1', 't-hn', 'Hoàng Long'),
    player('p-cg-2', 't-hn', 'Quốc Bảo'),
    player('p-hk-1', 't-hn', 'Đức Huy'),
    player('p-hk-2', 't-hn', 'Nhật Nam'),
    player('p-dd-1', 't-hn', 'Thành Đạt'),
    player('p-dd-2', 't-hn', 'Quang Minh'),
    player('p-bd-1', 't-hn', 'Hải Đăng'),
    player('p-bd-2', 't-hn', 'Phúc An'),
    player('p-tx-1', 't-hn', 'Văn Khôi'),
    player('p-tx-2', 't-hn', 'Trung Kiên'),
    player('p-hd-1', 't-hn', 'Gia Bảo'),
    player('p-hd-2', 't-hn', 'Minh Triết'),
    player('p-lb-1', 't-hn', 'Đăng Khoa'),
    player('p-lb-2', 't-hn', 'Việt Anh'),
    player('p-st-1', 't-dn', 'Ngọc Ánh'),
    player('p-st-2', 't-dn', 'Thu Hà'),
    player('p-hc-1', 't-dn', 'Mai Chi'),
    player('p-hc-2', 't-dn', 'Phương Linh'),
    player('p-tk-1', 't-dn', 'Khánh Vy'),
    player('p-tk-2', 't-dn', 'Bảo Trân'),
    player('p-lc-1', 't-dn', 'Yến Nhi'),
    player('p-lc-2', 't-dn', 'Hồng Nhung'),
    player('p-q1-1', 't-sg', 'Hoàng Phúc'),
    player('p-q1-2', 't-sg', 'Minh Quân'),
    player('p-q7-1', 't-sg', 'Tuấn Kiệt'),
    player('p-q7-2', 't-sg', 'Gia Huy'),
    player('p-td-1', 't-sg', 'Nhật Tân'),
    player('p-td-2', 't-sg', 'Công Vinh'),
    player('p-pn-1', 't-sg', 'Bảo Long'),
    player('p-pn-2', 't-sg', 'Khắc Dũng'),
  ],
  teams: [
    team('team-th', 't-hn', 'Minh Khoa / Tuấn Anh', ['p-th-1', 'p-th-2']),
    team('team-cg', 't-hn', 'Hoàng Long / Quốc Bảo', ['p-cg-1', 'p-cg-2']),
    team('team-hk', 't-hn', 'Đức Huy / Nhật Nam', ['p-hk-1', 'p-hk-2']),
    team('team-dd', 't-hn', 'Thành Đạt / Quang Minh', ['p-dd-1', 'p-dd-2']),
    team('team-bd', 't-hn', 'Hải Đăng / Phúc An', ['p-bd-1', 'p-bd-2']),
    team('team-tx', 't-hn', 'Văn Khôi / Trung Kiên', ['p-tx-1', 'p-tx-2']),
    team('team-hd', 't-hn', 'Gia Bảo / Minh Triết', ['p-hd-1', 'p-hd-2']),
    team('team-lb', 't-hn', 'Đăng Khoa / Việt Anh', ['p-lb-1', 'p-lb-2']),
    team('team-st', 't-dn', 'Ngọc Ánh / Thu Hà', ['p-st-1', 'p-st-2']),
    team('team-hc', 't-dn', 'Mai Chi / Phương Linh', ['p-hc-1', 'p-hc-2']),
    team('team-tk', 't-dn', 'Khánh Vy / Bảo Trân', ['p-tk-1', 'p-tk-2']),
    team('team-lc', 't-dn', 'Yến Nhi / Hồng Nhung', ['p-lc-1', 'p-lc-2']),
    team('team-q1', 't-sg', 'Hoàng Phúc / Minh Quân', ['p-q1-1', 'p-q1-2']),
    team('team-q7', 't-sg', 'Tuấn Kiệt / Gia Huy', ['p-q7-1', 'p-q7-2']),
    team('team-td', 't-sg', 'Nhật Tân / Công Vinh', ['p-td-1', 'p-td-2']),
    team('team-pn', 't-sg', 'Bảo Long / Khắc Dũng', ['p-pn-1', 'p-pn-2']),
  ],
  groups: [
    group('g-hn-a', 't-hn', 'Bảng A', ['team-th', 'team-cg', 'team-hk', 'team-dd']),
    group('g-hn-b', 't-hn', 'Bảng B', ['team-bd', 'team-tx', 'team-hd', 'team-lb']),
    group('g-dn', 't-dn', 'Bảng A', ['team-st', 'team-hc', 'team-tk', 'team-lc']),
    group('g-sg', 't-sg', 'Bảng A', ['team-q1', 'team-q7', 'team-td', 'team-pn']),
  ],
  matches: [
    played('hn-th-cg', 't-hn', 'g-hn-a', 'Sân 1', '2026-10-15T08:00:00+07:00', 'team-th', 'team-cg', [{ a: 11, b: 6 }], 'finished'),
    played('hn-th-hk', 't-hn', 'g-hn-a', 'Sân 2', '2026-10-15T08:45:00+07:00', 'team-th', 'team-hk', [{ a: 11, b: 9 }], 'finished'),
    played('hn-cg-hk', 't-hn', 'g-hn-a', 'Sân 1', '2026-10-15T09:30:00+07:00', 'team-cg', 'team-hk', [{ a: 11, b: 4 }], 'finished'),
    played('hn-cg-dd', 't-hn', 'g-hn-a', 'Sân 2', '2026-10-15T10:15:00+07:00', 'team-cg', 'team-dd', [{ a: 11, b: 7 }], 'finished'),
    played('hn-th-dd', 't-hn', 'g-hn-a', 'Sân 1', '2026-10-15T14:00:00+07:00', 'team-th', 'team-dd', [{ a: 6, b: 7 }], 'live'),
    {
      id: 'hn-hk-dd',
      tournamentId: 't-hn',
      stage: 'group',
      roundLabel: 'Vòng bảng',
      groupId: 'g-hn-a',
      court: 'Sân 2',
      scheduledAt: '2026-10-15T15:00:00+07:00',
      slotA: { kind: 'team', teamId: 'team-hk' },
      slotB: { kind: 'team', teamId: 'team-dd' },
      sets: [],
      status: 'finished',
      forfeit: 'A',
    },
    played('hn-bd-tx', 't-hn', 'g-hn-b', 'Sân 3', '2026-10-15T08:00:00+07:00', 'team-bd', 'team-tx', [{ a: 11, b: 8 }], 'finished'),
    played('hn-tx-lb', 't-hn', 'g-hn-b', 'Sân 4', '2026-10-15T08:45:00+07:00', 'team-tx', 'team-lb', [{ a: 7, b: 11 }], 'finished'),
    waiting('hn-bd-hd', 't-hn', 'g-hn-b', 'Sân 3', '2026-10-15T14:00:00+07:00', 'team-bd', 'team-hd'),
    waiting('hn-bd-lb', 't-hn', 'g-hn-b', 'Sân 4', '2026-10-15T14:45:00+07:00', 'team-bd', 'team-lb'),
    waiting('hn-tx-hd', 't-hn', 'g-hn-b', 'Sân 3', '2026-10-15T15:30:00+07:00', 'team-tx', 'team-hd'),
    waiting('hn-hd-lb', 't-hn', 'g-hn-b', 'Sân 4', '2026-10-15T16:15:00+07:00', 'team-hd', 'team-lb'),
    played('dn-st-hc', 't-dn', 'g-dn', 'Sân 1', '2026-10-02T08:00:00+07:00', 'team-st', 'team-hc', [{ a: 11, b: 5 }], 'finished'),
    played('dn-st-tk', 't-dn', 'g-dn', 'Sân 1', '2026-10-02T08:45:00+07:00', 'team-st', 'team-tk', [{ a: 11, b: 8 }], 'finished'),
    played('dn-st-lc', 't-dn', 'g-dn', 'Sân 1', '2026-10-02T09:30:00+07:00', 'team-st', 'team-lc', [{ a: 11, b: 9 }], 'finished'),
    played('dn-hc-tk', 't-dn', 'g-dn', 'Sân 1', '2026-10-02T10:15:00+07:00', 'team-hc', 'team-tk', [{ a: 11, b: 8 }], 'finished'),
    played('dn-hc-lc', 't-dn', 'g-dn', 'Sân 1', '2026-10-02T11:00:00+07:00', 'team-hc', 'team-lc', [{ a: 11, b: 6 }], 'finished'),
    played('dn-tk-lc', 't-dn', 'g-dn', 'Sân 1', '2026-10-02T11:45:00+07:00', 'team-tk', 'team-lc', [{ a: 11, b: 4 }], 'finished'),
    waiting('sg-q1-q7', 't-sg', 'g-sg', 'Sân 1', '2026-11-22T08:00:00+07:00', 'team-q1', 'team-q7'),
    waiting('sg-td-pn', 't-sg', 'g-sg', 'Sân 2', '2026-11-22T08:00:00+07:00', 'team-td', 'team-pn'),
    waiting('sg-q1-td', 't-sg', 'g-sg', 'Sân 1', '2026-11-22T09:00:00+07:00', 'team-q1', 'team-td'),
    waiting('sg-q7-pn', 't-sg', 'g-sg', 'Sân 2', '2026-11-22T09:00:00+07:00', 'team-q7', 'team-pn'),
    waiting('sg-q1-pn', 't-sg', 'g-sg', 'Sân 1', '2026-11-22T10:00:00+07:00', 'team-q1', 'team-pn'),
    waiting('sg-q7-td', 't-sg', 'g-sg', 'Sân 2', '2026-11-22T10:00:00+07:00', 'team-q7', 'team-td'),
  ],
}
