const apiUrl = "http://localhost:3000/api/users";
const token = localStorage.getItem("accessToken");

// Redirect to login if no token
if (!token) {
    window.location.href = "/login.html";
}

let table;

function fetchAccounts() {
    $.ajax({
        url: apiUrl,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        success: (data, textStatus, xhr) => {
            table.clear().rows.add(data).draw();

        },
        error: () => window.parent.showToast("Failed to load accounts", "error")
    });
}

function getCellValue(cell) {
    if (cell && cell.hyperlink) {
        const hyperlinkValue = cell.hyperlink;
        if (hyperlinkValue.startsWith('mailto:')) {
            return hyperlinkValue.substring('mailto:'.length); // Extract the email after 'mailto:'
        }
        return hyperlinkValue; // If it's a different type of hyperlink, return it as is
    }
    return cell.value; // Otherwise, return the plain value
}

function parseExcel(file) {
    return new Promise((resolve, reject) =>{
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = e.target.result;
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.load(data).then(() => {
                const worksheet = workbook.getWorksheet(1);
                if (!worksheet) {
                    reject(new Error("Worksheet is empty or not found."));
                    return;
                }
                const jsonData = [];
                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return; // Skip header row
                    const rowData = {
                        first_name: capitalizeFirstLetter(row.getCell(1).value),
                        last_name: capitalizeFirstLetter(row.getCell(2).value),
                        email: getCellValue(row.getCell(3)), // Use helper function to get email value
                        role: capitalizeFirstLetter(row.getCell(4).value),
                        password: String(row.getCell(5).value), // Read password from the fifth column
                        is_active: true // Default status
                    };
                    let hasData = false;
                    for (const key in rowData) {
                        if (rowData[key]) {
                            hasData = true;
                            break;
                        }
                    }
                    if(hasData){
                        jsonData.push(rowData);
                    }
                });
                resolve(jsonData);
            }).catch(reject);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.toString().charAt(0).toUpperCase() + string.toString().slice(1).toLowerCase();
}

function importUser(userData) {
    return $.ajax({
        url: `${apiUrl}`, // Use the single user creation endpoint
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        data: JSON.stringify(userData),
    });
}

$(document).ready(function () {
    table = $('#userAccountTable').DataTable({
        columns: [
            {
                data: null,
                render: function (data) {
                    return `${capitalizeFirstLetter(data.first_name)} ${capitalizeFirstLetter(data.last_name)}`;
                },
                responsivePriority: 1
            },
            { data: 'email',
                 render: function(data) {
                     return `${capitalizeFirstLetter(data) || data}`;
                 },
                 responsivePriority: 2 },
            { 
                data: 'role',
                render: function(data) {
                                       return capitalizeFirstLetter(data);
                },
                responsivePriority: 3 
            },
            {
                data: 'is_active',
                render: function (isActive) {
                    return isActive
                        ? `<span class="status-badge status-active">Active</span>`
                        : `<span class="status-badge status-inactive">Inactive</span>`;
                },
                responsivePriority: 4
            },
            {
                data: null,
                orderable: false,
                render: function () {
                    return `
                        <button class="actions-button edit-button me-1">Edit</button>
                        <button class="actions-button delete-button">Delete</button>
                    `;
                },
                responsivePriority: 5
            }
        ],
        responsive: true,
        language: {
            searchPlaceholder: "Search Accounts...",
            lengthMenu: "Show _MENU_ accounts",
            info: "Showing _START_ to _END_ of _TOTAL_ accounts",
            infoEmpty: "Showing 0 to 0 of 0 accounts",
            infoFiltered: "(filtered from _MAX_ total accounts)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        },
        lengthMenu: [10, 25, 50, 100],
    });

    $('#userAccountTable_length').on('change', function () {
        table.page.len(this.value).draw();
    });

    fetchAccounts();

    // On edit button click
    $('#userAccountTable tbody').on('click', '.edit-button', function () {
        const data = table.row($(this).parents('tr')).data();
        $('#editAccountId').val(data.id);
        $('#editAccountFirstName').val(data.first_name || "");
        $('#editAccountLastName').val(data.last_name || "");
        $('#editAccountEmail').val(data.email || "");
        $('#editAccountRole').val(data.role);
        $('#editAccountActive').prop('checked', data.is_active);
        $('#editAccountNewPassword').val("");

        new bootstrap.Modal(document.getElementById('userEditModal')).show();
    });

    // On form submit
    $('#editAccountForm').on('submit', function (e) {
        e.preventDefault();
        const id = $('#editAccountId').val();

        const email = $('#editAccountEmail').val();
        const newPassword = $('#editAccountNewPassword').val();

        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            return window.parent.showToast("Invalid email format", "error");
        }

        const updatedData = {};
        if ($('#editAccountFirstName').val()) updatedData.first_name = $('#editAccountFirstName').val();
        if ($('#editAccountLastName').val()) updatedData.last_name = $('#editAccountLastName').val();
        if (email) updatedData.email = email;
        if ($('#editAccountRole').val()) updatedData.role = $('#editAccountRole').val();
        updatedData.is_active = $('#editAccountActive').is(':checked');

        if (Object.keys(updatedData).length > 0) {
            $.ajax({
                url: `${apiUrl}/${id}`,
                method: 'PATCH',
                headers: {
                    "Authorization": token,

                    "Content-Type": "application/json"
                },
                data: JSON.stringify(updatedData),
                success: () => {
                    window.parent.showToast("Account info updated", "Success");
                    fetchAccounts();
                },
                error: () => window.parent.showToast("Failed to update account info", "error")
            });
        }

        if (newPassword) {
            $.ajax({
                url: `${apiUrl}/${id}/password`,
                method: 'PATCH',
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({ password: newPassword }),
                success: () => window.parent.showToast("Password updated", "Success"),
                error: () => window.parent.showToast("Password update failed", "error")
            });
        }

        bootstrap.Modal.getInstance(document.getElementById('userEditModal')).hide();
    });

    // Delete button click
    $('#userAccountTable tbody').on('click', '.delete-button', function () {
        const data = table.row($(this).parents('tr')).data();
        if (confirm(`Are you sure you want to delete ${data.first_name} ${data.last_name}?`)) {
            $.ajax({
                url: `${apiUrl}/${data.id}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                success: () => {
                    window.parent.showToast('Account deleted successfully', 'success');
                    fetchAccounts(); // Refresh table
                },
                error: () => window.parent.showToast('Failed to delete account', 'error')
            });
        }
    });

    // Export to Excel
    $('#exportExcelBtn').on('click', function () {
        const data = table.data().toArray();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('User Accounts');

        const header = ['Name', 'Email', 'Role', 'Status'];
        worksheet.addRow(header);

        data.forEach(row => {
            const rowData = [
                `${row.first_name} ${row.last_name}`,
                row.email,
                row.role,
                row.is_active ? 'Active' : 'Inactive'
            ];
            worksheet.addRow(rowData);
        });

        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'user_accounts.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // Import from Excel - New Flow
    $('#importExcelBtn').on('click', function() {
        $('#importExcelFile').click(); // Trigger click on hidden file input
    });

    $('#importExcelFile').on('change', async function(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const usersToImport = await parseExcel(file);
                if (usersToImport && usersToImport.length > 0) {
                    let successCount = 0;
                    let errorCount = 0;
                    const totalUsers = usersToImport.length;

                    // Show initial progress toast
                    window.parent.showToast(`Starting import of ${totalUsers} users...`, 'info');

                    for (let i = 0; i < totalUsers; i++) {
                        const userData = usersToImport[i];
                        try {
                            await importUser(userData);
                            successCount++;
                            // Optionally, update progress toast more frequently
                            // window.parent.showToast(`Importing: ${successCount}/${totalUsers} successful, ${errorCount} failed.`, 'info');
                        } catch (error) {
                            console.error('Error importing user:', userData.email, error);
                            errorCount++;
                        }
                    }

                    if (successCount > 0) {
                        window.parent.showToast(`${successCount} user(s) imported successfully.`, 'success');
                        fetchAccounts(); // Refresh table
                    }
                    if (errorCount > 0) {
                        window.parent.showToast(`${errorCount} user(s) failed to import. Check console for details.`, 'error');
                    }
                    if (successCount === 0 && errorCount === 0) {
                         window.parent.showToast('No data to import or file was empty.', 'warning');
                    }
                } else {
                    window.parent.showToast('No valid user data found in the Excel file.', 'warning');
                }
            } catch (error) {
                console.error('Error parsing Excel file:', error);
                window.parent.showToast('Failed to parse Excel file. ' + error.message, 'error');
            }
            // Reset file input to allow re-uploading the same file if needed
            $(this).val('');
        } else {
            window.parent.showToast('No file selected.', 'info');
        }
    });

    // Create User Form Submission
    $('#createUserForm').on('submit', function (e) {
        e.preventDefault();
        const $submitBtn = $('#createUserForm button[type="submit"]');
        $submitBtn.prop('disabled', true);

        const userData = {
            first_name: capitalizeFirstLetter($('#createFirstName').val()),
            last_name: capitalizeFirstLetter($('#createLastName').val()),
            email: $('#createEmail').val(),
            role: $('#createRole').val(),
            password: $('#createPassword').val(),
            is_active: $('#createIsActive').is(':checked')
        };

        $.ajax({
            url: apiUrl,
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            data: JSON.stringify(userData),
            success: (response) => {
                window.parent.showToast(response.message || 'User created successfully!', 'success');
                fetchAccounts();
                bootstrap.Modal.getInstance(document.getElementById('userCreateModal')).hide();
                $('#createUserForm')[0].reset(); // Also reset after successful submission
                $('#createIsActive').prop('checked', true);
            },
            error: (xhr) => {
                let errorMessage = 'Failed to create user.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.responseJSON && Array.isArray(xhr.responseJSON.errors) && xhr.responseJSON.errors.length > 0) {
                    errorMessage = xhr.responseJSON.errors.map(err => err.msg).join(' ');
                } else if (xhr.responseText) {
                    try {
                        const parsedError = JSON.parse(xhr.responseText);
                        if(parsedError && parsedError.message) errorMessage = parsedError.message;
                    } catch (e) { /* Ignore parsing error, use default */ }
                }
                window.parent.showToast(errorMessage, 'error');
            },
            complete: () => {
                $submitBtn.prop('disabled', false);
            }
        });
    });

    // Reset Create User Modal on show
    $('#userCreateModal').on('show.bs.modal', function () {
        $('#createUserForm')[0].reset(); // Reset the form fields
        $('#createIsActive').prop('checked', true); // Ensure 'Active' is checked by default
        $('#createUserForm button[type="submit"]').prop('disabled', false); // Ensure submit button is enabled
    });
});
