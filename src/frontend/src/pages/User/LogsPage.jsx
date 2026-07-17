import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import UserLayout from '../../components/User/UserLayout';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

const LogsPage = () => {
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [gardens, setGardens] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [plotOptions, setPlotOptions] = useState([]);
  const [selectedPlotIds, setSelectedPlotIds] = useState([]);
  const [editingGardenId, setEditingGardenId] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedGardenFilter, setSelectedGardenFilter] = useState('');
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState('');
  const detailCloseTimerRef = useRef(null);
  const ITEMS_PER_PAGE = 10;
  const { register, handleSubmit, reset, watch } = useForm();

  const selectedGarden = watch('garden_id');

  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (location.pathname === '/user/logs/new') {
      setShowForm(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchPlots = async () => {
      if (!selectedGarden) {
        setPlotOptions([]);
        setSelectedPlotIds([]);
        return;
      }

      try {
        const res = await apiClient.get(`/plots/garden/${selectedGarden}`);
        const plots = res.data.data || [];
        setPlotOptions(plots);

        const plotIds = plots.map((plot) => plot._id);
        if (!editingId) {
          setSelectedPlotIds(plotIds);
          return;
        }

        if (editingGardenId && String(editingGardenId) === String(selectedGarden)) {
          setSelectedPlotIds((current) => current.filter((plotId) => plotIds.includes(plotId)));
          return;
        }

        setSelectedPlotIds(plotIds);
      } catch (error) {
        console.error('❌ Error fetching plots:', error);
        setPlotOptions([]);
        setSelectedPlotIds([]);
      }
    };

    fetchPlots();
  }, [selectedGarden, editingId, editingGardenId]);

  useEffect(() => {
    fetchData();
  }, []);

  const seasonOptions = useMemo(() => {
    return seasons
      .filter((season) => season.trang_thai === 'Đang diễn ra' || season.trang_thai === 'Đã kết thúc')
      .sort((a, b) => {
        if (a.trang_thai !== b.trang_thai) {
          return a.trang_thai === 'Đang diễn ra' ? -1 : 1;
        }

        if (b.nam !== a.nam) {
          return Number(b.nam || 0) - Number(a.nam || 0);
        }

        return Number(b.thang_bat_dau || 0) - Number(a.thang_bat_dau || 0);
      });
  }, [seasons]);

  useEffect(() => {
    if (seasonOptions.length === 0) return;

    const selectedExists = seasonOptions.some((season) => String(season._id) === String(selectedSeasonFilter));
    if (!selectedSeasonFilter || !selectedExists) {
      const currentSeason = seasonOptions.find((season) => season.trang_thai === 'Đang diễn ra');
      setSelectedSeasonFilter(currentSeason?._id || seasonOptions[0]?._id || '');
    }
  }, [seasonOptions, selectedSeasonFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [gardensRes, seasonsRes] = await Promise.all([
        apiClient.get('/gardens'),
        apiClient.get('/seasons'),
      ]);

      const gardensData = gardensRes.data.data || [];
      setGardens(gardensData);

      const seasonsData = seasonsRes.data.data || [];
      setSeasons(seasonsData);

      const visibleSeasons = seasonsData
        .filter((season) => season.trang_thai === 'Đang diễn ra' || season.trang_thai === 'Đã kết thúc')
        .sort((a, b) => {
          if (a.trang_thai !== b.trang_thai) {
            return a.trang_thai === 'Đang diễn ra' ? -1 : 1;
          }

          if (b.nam !== a.nam) {
            return Number(b.nam || 0) - Number(a.nam || 0);
          }

          return Number(b.thang_bat_dau || 0) - Number(a.thang_bat_dau || 0);
        });

      const currentSeason = visibleSeasons.find((season) => season.trang_thai === 'Đang diễn ra');
      setSelectedSeasonFilter((current) => {
        const selectedExists = visibleSeasons.some((season) => String(season._id) === String(current));
        return current && selectedExists ? current : (currentSeason?._id || visibleSeasons[0]?._id || '');
      });

      let allLogs = [];
      if (gardensData.length > 0) {
        const logPromises = gardensData.map((garden) =>
          apiClient.get(`/logs/garden/${garden._id}`).catch((err) => {
            console.warn(`⚠️ Error fetching logs for garden ${garden._id}:`, err.message);
            return { data: { data: [] } };
          })
        );
        const logResponses = await Promise.all(logPromises);
        allLogs = logResponses.flatMap((res) => res.data.data || []);
      }

      const tasksRes = await apiClient.get('/tasks');
      setTasks(tasksRes.data.data || []);
      setLogs(allLogs);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const uniquePlotIds = Array.from(new Set((selectedPlotIds || []).filter(Boolean)));
      const submitData = {
        ...data,
        plot_id: uniquePlotIds[0] || null,
        plot_ids: uniquePlotIds,
      };

      if (uniquePlotIds.length === 0) {
        toast.error('Vui lòng chọn ít nhất 1 mẫu đất');
        return;
      }

      if (editingId) {
        await apiClient.put(`/logs/${editingId}`, submitData);
        toast.success('Nhật ký được cập nhật thành công');
      } else {
        await apiClient.post('/logs', submitData);
        toast.success('Nhật ký được tạo thành công');
      }

      await fetchData();
      reset();
      setSelectedPlotIds([]);
      setEditingGardenId(null);
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error('Error saving log:', err);
      toast.error(err.response?.data?.message || 'Không thể lưu nhật ký');
    }
  };

  const handleEdit = (log) => {
    setEditingId(log._id);
    const resolvedPlotIds = (log.plot_ids || [])
      .map((plot) => (plot?._id || plot))
      .filter(Boolean)
      .map(String);

    const resolvedSinglePlotId = (log.plot_id?._id || log.plot_id || '').toString();
    const normalizedPlotIds = resolvedPlotIds.length > 0
      ? resolvedPlotIds
      : (resolvedSinglePlotId ? [resolvedSinglePlotId] : []);

    const logData = {
      ...log,
      garden_id: log.garden_id?._id || log.garden_id,
      task_id: log.task_id?._id || log.task_id,
      ngay_lam: new Date(log.ngay_lam).toISOString().split('T')[0],
    };
    reset(logData);
    setSelectedPlotIds(normalizedPlotIds);
    setEditingGardenId(logData.garden_id);
    setShowForm(true);
  };

  const handleTogglePlot = (plotId, checked) => {
    setSelectedPlotIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, plotId]));
      }
      return current.filter((id) => id !== plotId);
    });
  };

  const handleToggleAllPlots = (checked) => {
    if (checked) {
      setSelectedPlotIds(plotOptions.map((plot) => plot._id));
      return;
    }
    setSelectedPlotIds([]);
  };

  const handleDeleteLog = async (logId) => {
    try {
      await apiClient.delete(`/logs/${logId}`);
      toast.success('Nhật ký được xóa thành công');
      setLogs((currentLogs) => currentLogs.filter((log) => log._id !== logId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting log:', err);
      toast.error(err.response?.data?.message || 'Không thể xóa nhật ký');
    }
  };

  const openLogDetail = (log) => {
    if (detailCloseTimerRef.current) {
      clearTimeout(detailCloseTimerRef.current);
      detailCloseTimerRef.current = null;
    }

    setSelectedLog(log);
  };

  const closeLogDetail = () => {
    if (detailCloseTimerRef.current) {
      clearTimeout(detailCloseTimerRef.current);
      detailCloseTimerRef.current = null;
    }

    setSelectedLog(null);
  };

  const scheduleCloseLogDetail = () => {
    if (detailCloseTimerRef.current) {
      clearTimeout(detailCloseTimerRef.current);
    }

    detailCloseTimerRef.current = setTimeout(() => {
      setSelectedLog(null);
      detailCloseTimerRef.current = null;
    }, 250);
  };

  const handleToggleCompleted = async (log) => {
    try {
      const nextCompleted = !Boolean(log.is_completed);
      const payload = {
        garden_id: log.garden_id?._id || log.garden_id,
        task_id: log.task_id?._id || log.task_id,
        plot_id: log.plot_id?._id || log.plot_id,
        ngay_lam: new Date(log.ngay_lam).toISOString().split('T')[0],
        ghi_chu: log.ghi_chu || '',
        nguoi_thuc_hien: log.nguoi_thuc_hien || '',
        is_completed: nextCompleted,
      };

      await apiClient.put(`/logs/${log._id}`, payload);
      setLogs((currentLogs) =>
        currentLogs.map((item) => (item._id === log._id ? { ...item, is_completed: nextCompleted } : item))
      );
      toast.success(nextCompleted ? 'Đã đánh dấu hoàn thành' : 'Đã bỏ đánh dấu hoàn thành');
    } catch (err) {
      console.error('Error toggling log completion:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (selectedGardenFilter) {
      result = result.filter((log) => String(log.garden_id?._id || log.garden_id) === String(selectedGardenFilter));
    }

    if (selectedSeasonFilter) {
      result = result.filter((log) => String(log.season_id?._id || log.season_id) === String(selectedSeasonFilter));
    }

    const getPlotNames = (log) => {
      const namesFromArray = (log.plot_ids || [])
        .map((plot) => (typeof plot === 'object' ? plot?.name : ''))
        .filter(Boolean);

      if (namesFromArray.length > 0) {
        return namesFromArray;
      }

      const fallbackName = typeof log.plot_id === 'object' ? log.plot_id?.name : '';
      return fallbackName ? [fallbackName] : [];
    };

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter((log) =>
        log.garden_id?.ten_vuon?.toLowerCase().includes(query) ||
        log.task_id?.ten_cong_viec?.toLowerCase().includes(query) ||
        log.nguoi_thuc_hien?.toLowerCase().includes(query) ||
        getPlotNames(log).join(', ').toLowerCase().includes(query)
      );
    }

    // Sort so that unfinished (is_completed false) come first,
    // then order by date (newest first). If date is equal, sort by garden name.
    const sorted = result.slice().sort((a, b) => {
      const aDone = Boolean(a.is_completed);
      const bDone = Boolean(b.is_completed);
      if (aDone !== bDone) return aDone ? 1 : -1; // unfinished first

      const aTime = a.ngay_lam ? new Date(a.ngay_lam).getTime() : 0;
      const bTime = b.ngay_lam ? new Date(b.ngay_lam).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime; // newest first

      const aGarden = (a.garden_id?.ten_vuon || '').toLowerCase();
      const bGarden = (b.garden_id?.ten_vuon || '').toLowerCase();
      return aGarden.localeCompare(bGarden, 'vi');
    });

    return sorted;
  }, [logs, searchTerm, selectedGardenFilter, selectedSeasonFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGardenFilter, selectedSeasonFilter]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <UserLayout>
      <div>
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-green-600">Nhật Ký Canh Tác</h1>
          <button
            onClick={() => {
              setEditingId(null);
              reset({ ngay_lam: getTodayDateString(), is_completed: false });
              setSelectedPlotIds([]);
              setEditingGardenId(null);
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <FaPlus /> Thêm Nhật Ký Mới
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? (
                <><FaEdit className="inline mr-2" /> Sửa Nhật Ký</>
              ) : (
                <><FaPlus className="inline mr-2" /> Tạo Nhật Ký Mới</>
              )}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vườn <span className="text-red-600">*</span>
                  </label>
                  <select
                    {...register('garden_id', { required: 'Bắt buộc' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Chọn vườn</option>
                    {gardens.map((garden) => (
                      <option key={garden._id} value={garden._id}>
                        {garden.ten_vuon}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Công Việc <span className="text-red-600">*</span>
                  </label>
                  <select
                    {...register('task_id', { required: 'Bắt buộc' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Chọn công việc</option>
                    {tasks.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.ten_cong_viec}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mẫu Đất <span className="text-red-600">*</span>
                  </label>
                  {!selectedGarden ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                      Hãy chọn vườn trước để hiển thị danh sách mẫu đất.
                    </div>
                  ) : plotOptions.length > 0 ? (
                    <>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                        <input
                          type="checkbox"
                          checked={plotOptions.length > 0 && selectedPlotIds.length === plotOptions.length}
                          onChange={(e) => handleToggleAllPlots(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        Tất cả
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {plotOptions.map((plot) => (
                          <label
                            key={plot._id}
                            className="flex items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:border-green-300"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPlotIds.includes(plot._id)}
                              onChange={(e) => handleTogglePlot(plot._id, e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-gray-800">
                              {plot.name}
                              <span className="ml-1 text-gray-500">({Number(plot.area || 0).toFixed(1)} m²)</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                      Vườn này chưa có mẫu đất nào.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày Làm <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('ngay_lam', { required: 'Bắt buộc' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người Thực Hiện</label>
                  <input
                    type="text"
                    {...register('nguoi_thuc_hien')}
                    placeholder="Tên người thực hiện..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi Chú</label>
                <textarea
                  {...register('ghi_chu')}
                  placeholder="Ghi chú về công việc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  {editingId ? <><FaCheck /> Cập Nhật</> : <><FaCheck /> Tạo Mới</>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                    setSelectedPlotIds([]);
                    setEditingGardenId(null);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition flex items-center justify-center gap-2"
                >
                  <FaTimes /> Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center">
          <input
            type="text"
            placeholder="Tìm kiếm theo vườn, công việc, mẫu đất hoặc người thực hiện..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={selectedGardenFilter}
            onChange={(e) => setSelectedGardenFilter(e.target.value)}
            className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Tất cả</option>
            {gardens.map((garden) => (
              <option key={garden._id} value={garden._id}>
                {garden.ten_vuon}
              </option>
            ))}
          </select>
          <select
            value={selectedSeasonFilter}
            onChange={(e) => setSelectedSeasonFilter(e.target.value)}
            className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {seasonOptions.length === 0 ? (
              <option value="">Không có mùa vụ phù hợp</option>
            ) : (
              seasonOptions.map((season) => {
                const isCurrent = season.trang_thai === 'Đang diễn ra';
                return (
                  <option key={season._id} value={season._id}>
                    {isCurrent} {season.ten_mua_vu} ({season.nam})
                  </option>
                );
              })
            )}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Đang tải nhật ký...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              {logs.length === 0 ? (
                <>
                  <p className="mb-4">Chưa có nhật ký nào</p>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      reset();
                      setShowForm(true);
                    }}
                    className="text-green-600 font-semibold hover:text-green-700"
                  >
                    Tạo nhật ký đầu tiên →
                  </button>
                </>
              ) : (
                <p>Không tìm thấy nhật ký phù hợp</p>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vườn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tên mẫu đất</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Công Việc</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Người Thực Hiện</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Ngày Làm</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Trạng Thái</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedLogs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onMouseEnter={() => openLogDetail(log)}
                    onMouseLeave={scheduleCloseLogDetail}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{log.garden_id?.ten_vuon}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{
                        (log.plot_ids || [])
                          .map((plot) => plot?.name)
                          .filter(Boolean)
                          .join(', ') || log.plot_id?.name || '—'
                      }</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900 font-medium">{log.task_id?.ten_cong_viec}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{log.nguoi_thuc_hien || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="text-gray-600 text-sm">{new Date(log.ngay_lam).toLocaleDateString('vi-VN')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleCompleted(log)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2"
                        title={log.is_completed ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                            log.is_completed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {log.is_completed ? 'Đã' : 'Chưa'}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(log.is_completed)}
                          readOnly
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(log)}
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm"
                      >
                        <FaEdit className="inline mr-1" /> Sửa
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(log._id)}
                        className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm"
                      >
                        <FaTrash className="inline mr-1" /> Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Trang <span className="font-semibold">{currentPage}</span> / <span className="font-semibold">{totalPages}</span> ({filteredLogs.length} nhật ký)
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Xác Nhận Xóa</h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa nhật ký này không? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDeleteLog(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedLog && (
          <div
            className="fixed z-50"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            onMouseEnter={() => {
              if (detailCloseTimerRef.current) {
                clearTimeout(detailCloseTimerRef.current);
                detailCloseTimerRef.current = null;
              }
            }}
            onMouseLeave={scheduleCloseLogDetail}
          >
            <div className="relative z-10 max-w-xl rounded-lg bg-white p-4 shadow-2xl border-2 border-green-200">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {selectedLog.ghi_chu?.trim() ? selectedLog.ghi_chu : 'Không có ghi chú.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default LogsPage;
