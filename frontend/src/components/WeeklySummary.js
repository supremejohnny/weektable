import React from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-grids';

function WeeklySummary({ weeklyData, tasks }) {
  const taskColumns = tasks.map(task => ({
    field: `task_${task.id}`,
    headerText: task.name,
    type: 'boolean',
    displayAsCheckBox: true,
    textAlign: 'Center',
    width: '120'
  }));
  return (
    <GridComponent dataSource={weeklyData} allowSelection={false} height={300}>
      <ColumnsDirective>
        <ColumnDirective field='day' headerText='星期' textAlign='Center' width='100' />
        {taskColumns.map(col => (
          <ColumnDirective key={col.field} {...col} />
        ))}
      </ColumnsDirective>
    </GridComponent>
  );
}

export default WeeklySummary;
