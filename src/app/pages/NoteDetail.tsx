import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dummyNotes } from '../data/dummyData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Pin, Upload, X } from 'lucide-react';

export function NoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const note = isNew ? null : dummyNotes.find(n => n.id === id);
  
  const [isPinned, setIsPinned] = useState(note?.pinned || false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/notes')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl">
              {isNew ? 'Tambah Note' : 'Detail Note'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isNew ? 'Buat catatan baru' : 'Lihat dan edit catatan'}
            </p>
          </div>
        </div>
        
        {!isNew && (
          <Button
            variant={isPinned ? 'default' : 'outline'}
            onClick={() => setIsPinned(!isPinned)}
            className="gap-2"
          >
            <Pin size={16} />
            {isPinned ? 'Unpin' : 'Pin'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Judul</Label>
            <Input
              id="title"
              placeholder="Judul catatan..."
              defaultValue={note?.title || ''}
            />
          </div>

          <div>
            <Label htmlFor="content">Isi Catatan</Label>
            <Textarea
              id="content"
              placeholder="Tulis catatan Anda di sini..."
              defaultValue={note?.content || ''}
              rows={10}
            />
          </div>

          {!isNew && note && (
            <div>
              <Label>Timestamp</Label>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(note.timestamp).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lampiran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Upload File (Opsional)</Label>
            <div className="mt-2 space-y-2">
              <Button variant="outline" className="w-full gap-2">
                <Upload size={16} />
                Upload Image / PDF
              </Button>
              
              <p className="text-xs text-gray-500">
                Anda dapat menambahkan lebih dari 1 file. Nama file dapat diedit.
              </p>
              
              {note?.attachments && note.attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {note.attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="outline">{file.type}</Badge>
                        <Input
                          defaultValue={file.name}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isPinned && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Pin size={20} className="text-blue-600" />
              <div>
                <p>Note ini akan muncul di bagian atas daftar</p>
                <p className="text-sm text-gray-600 mt-1">
                  Catatan terpin juga muncul di Dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button className="flex-1">
          {isNew ? 'Simpan Note' : 'Update Note'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/notes')}>
          Batal
        </Button>
      </div>
    </div>
  );
}
