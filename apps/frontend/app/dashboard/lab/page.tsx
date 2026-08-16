'use client';

import { useState } from 'react';
import { useLabOrderQueue, useCollectSample, useUploadResult, useApproveLabOrder } from '@/services/lab-orders.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-client';
import { LabOrderStatus, type LabOrderQueueItem } from '@medcore/shared-types';

const STATUS_STYLES: Record<LabOrderStatus, string> = {
  [LabOrderStatus.ORDERED]: 'bg-amber-50 text-amber-700',
  [LabOrderStatus.SAMPLE_COLLECTED]: 'bg-blue-50 text-blue-700',
  [LabOrderStatus.RESULT_UPLOADED]: 'bg-purple-50 text-purple-700',
  [LabOrderStatus.APPROVED]: 'bg-green-50 text-green-700',
};

function LabOrderCard({ order }: { order: LabOrderQueueItem }) {
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const collectSample = useCollectSample();
  const uploadResult = useUploadResult();
  const approve = useApproveLabOrder();

  const handleCollect = async () => {
    setErrorMessage(null);
    try {
      await collectSample.mutateAsync(order.id);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  const handleUpload = async () => {
    setErrorMessage(null);
    const items = order.items.map((item) => ({
      labOrderItemId: item.id,
      resultValue: Number(resultValues[item.id]),
    }));
    if (items.some((i) => Number.isNaN(i.resultValue))) {
      setErrorMessage('Enter a value for every test before uploading.');
      return;
    }
    try {
      await uploadResult.mutateAsync({ id: order.id, items });
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  const handleApprove = async () => {
    setErrorMessage(null);
    try {
      await approve.mutateAsync(order.id);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-900">{order.patientName}</div>
          <div className="text-sm text-zinc-500">
            {order.items.map((i) => i.testName).join(', ')}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}

      {order.status === LabOrderStatus.ORDERED && (
        <Button size="sm" className="mt-3" disabled={collectSample.isPending} onClick={handleCollect}>
          {collectSample.isPending ? 'Collecting...' : 'Collect Sample'}
        </Button>
      )}

      {order.status === LabOrderStatus.SAMPLE_COLLECTED && (
        <div className="mt-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className="w-32 shrink-0 text-zinc-700">{item.testName}</span>
              <Input
                type="number"
                step="any"
                placeholder={`Value (${item.unit})`}
                value={resultValues[item.id] ?? ''}
                onChange={(e) => setResultValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                className="w-32"
              />
              <span className="text-zinc-400">
                {item.refRangeLow ?? '?'}–{item.refRangeHigh ?? '?'} {item.unit}
              </span>
            </div>
          ))}
          <Button size="sm" disabled={uploadResult.isPending} onClick={handleUpload}>
            {uploadResult.isPending ? 'Uploading...' : 'Upload Results'}
          </Button>
        </div>
      )}

      {order.status === LabOrderStatus.RESULT_UPLOADED && (
        <div className="mt-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-zinc-700">{item.testName}</span>
              <span className={item.isFlagged ? 'font-medium text-red-600' : 'text-zinc-600'}>
                {item.resultValue} {item.unit} {item.isFlagged && '⚠ Out of range'}
              </span>
            </div>
          ))}
          <Button size="sm" disabled={approve.isPending} onClick={handleApprove}>
            {approve.isPending ? 'Approving...' : 'Approve Report'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function LabTechnicianDashboardPage() {
  const { data: orders, isLoading, isError } = useLabOrderQueue();

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">Lab Order Queue</h1>
      <p className="mt-1 text-sm text-zinc-500">Orders awaiting collection, results, or approval.</p>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
        {isError && <p className="text-sm text-red-600">Couldn&apos;t load the lab order queue.</p>}
        {orders?.length === 0 && <p className="text-sm text-zinc-500">Nothing pending — all caught up.</p>}
        {orders?.map((order) => (
          <LabOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}