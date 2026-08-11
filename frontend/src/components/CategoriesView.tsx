import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryCreate, CategoryResponse, CategoryType } from '../types/api';
import { Layers, Plus, Trash2, Edit2, ChevronRight, Tag, X, FolderTree, List } from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const { categories, categoryTree, addCategory, updateCategory, deleteCategory, isLoading } = useApp();

  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState('#10B981');
  const [description, setDescription] = useState('');

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setParentId('');
    setType('expense');
    setColor('#10B981');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryResponse) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentId(cat.parent_id || '');
    setType(cat.type);
    setColor(cat.color || '#10B981');
    setDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name,
        parent_id: parentId || null,
        type,
        color,
        description: description || null,
      });
    } else {
      const data: CategoryCreate = {
        name,
        parent_id: parentId || null,
        type,
        color,
        description: description || null,
      };
      await addCategory(data);
    }
    setIsModalOpen(false);
  };

  return (
    <div id="categories-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Danh mục Thu & Chi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cấu trúc phân cấp Cha - Con (/api/v1/categories & /api/v1/categories/tree).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'tree' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Cấu trúc Cây</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'flat' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Phẳng</span>
            </button>
          </div>

          <button
            id="btn-add-category"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm Danh mục</span>
          </button>
        </div>
      </div>

      {/* Tree or Flat Content */}
      {viewMode === 'tree' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryTree.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || '#10B981' }}
                  />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.name}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Xóa danh mục ${item.name}?`)) deleteCategory(item.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {item.children && item.children.length > 0 && (
                <div className="pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-2 mt-2">
                  {item.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{child.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa danh mục con ${child.name}?`)) deleteCategory(child.id);
                        }}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="p-4">Tên danh mục</th>
                <th className="p-4">Loại</th>
                <th className="p-4">Mô tả</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#10B981' }} />
                    {cat.name}
                  </td>
                  <td className="p-4 uppercase text-[10px] font-semibold text-slate-500">{cat.type}</td>
                  <td className="p-4 text-slate-500">{cat.description || '---'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 mr-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xóa danh mục ${cat.name}?`)) deleteCategory(cat.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Modal */}
      {isModalOpen && (
        <div id="modal-category-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div id="modal-category-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tiền thưởng, Quần áo..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Loại</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CategoryType)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                  >
                    <option value="expense">Chi tiêu</option>
                    <option value="income">Thu nhập</option>
                    <option value="transfer">Chuyển khoản</option>
                    <option value="instalment">Trả góp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Màu sắc</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Danh mục cha</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="">-- Không có (Danh mục gốc) --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-md"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
