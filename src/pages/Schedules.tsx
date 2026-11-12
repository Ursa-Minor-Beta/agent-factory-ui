import { SchedulesList } from '../components/Schedules';

export function SchedulesPage() {
  return (
    <SchedulesList
      description="Run agents automatically on a schedule"
      excludeColumns={['agent']}
    />
  );
}
