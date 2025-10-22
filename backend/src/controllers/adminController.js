import { adminService } from "../services/adminService.js";
import { notificationService } from "../services/notificationService.js";
//import multer from "multer";
import * as XLSX from "xlsx";
import fs from "fs";
//import { statsService } from "../services/statsService.js";

export const adminController = {
    // Dashboard Stats
    async getDashboardStats(req, res) {
        try {
            const stats = await adminService.getDashboardStats();
            res.json(stats);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch dashboard stats" });
        }
    },
    // Company Management
    async createCompany(req, res) {
        try {
            const company = await adminService.createCompany(req.body);
            res.status(201).json(company);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to create company" });
        }
    },

    async getCompanies(req, res) {
        try {
            const companies = await adminService.getAllCompanies();
            res.json(companies);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch companies" });
        }
    },

    async updateCompany(req, res) {
        try {
            const company = await adminService.updateCompany(req.params.id, req.body);
            res.json(company);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to update company" });
        }
    },

    async deleteCompany(req, res) {
        try {
            await adminService.deleteCompany(req.params.id);
            res.json({ message: "Company deleted successfully" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to delete company" });
        }
    },

    // Job Management
    async createJob(req, res) {
        try {
            console.log("inside controller");
            console.log(req.body);
            const job = await adminService.createJob(req.body);
            res.status(201).json(job);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to create job" });
        }
    },

    async getJobs(req, res) {
        try {
            const jobs = await adminService.getAllJobs();
            res.json(jobs);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch jobs" });
        }
    },

    async updateJob(req, res) {
        try {
            const job = await adminService.updateJob(req.params.id, req.body);
            res.json(job);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to update job" });
        }
    },

    async deleteJob(req, res) {
        try {
            await adminService.deleteJob(req.params.id);
            res.json({ message: "Job deleted successfully" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to delete job" });
        }
    },

    // Application Management
    async getApplicationsForJob(req, res) {
        try {
            const applications = await adminService.getApplicationsForJob(req.params.jobId);
            res.json(applications);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch applications" });
        }
    },

    async updateApplicationStatus(req, res) {
        try {
            const { applicationId } = req.params;
            const { status } = req.body;
            const result = await adminService.updateApplicationStatus(applicationId, status);
            res.json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to update application status" });
        }
    },

    // Bulk Status Updates
    async updateBulkApplicationStatus(req, res) {
        try {
            const { jobId } = req.params;
            const { status, studentIds } = req.body;
            const result = await adminService.updateBulkApplicationStatus(jobId, status, studentIds);
            res.json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to update application statuses" });
        }
    },

    // Dashboard Stats
    async getDashboardStats(req, res) {
        try {
            const stats = await adminService.getDashboardStats();
            res.json(stats);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch dashboard stats" });
        }
    },

    // Student Management
    async getAllStudents(req, res) {
        try {
            const students = await adminService.getAllStudents();
            res.json(students);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to fetch students" });
        }
    },

    async updateStudentStatus(req, res) {
        try {
            const { studentId } = req.params;
            const { status } = req.body;
            const result = await adminService.updateStudentStatus(studentId, status);
            res.json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Failed to update student status" });
        }
    },

    // Notification Management
    async sendNotification(req, res) {
        try {
            const { statusUpdate, companyName, customMessage } = req.body;
            const excelFile = req.file;

            if (!excelFile) {
                return res.status(400).json({ message: "Excel file is required" });
            }

            // Parse Excel file to extract emails
            const fileBuffer = fs.readFileSync(excelFile.path);
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Extract emails from the Excel file
            const emails = jsonData
                .map(row => {
                    const emailValue = row.email || row.Email || row.EMAIL ||
                        row["Email Address"] || row["email address"] ||
                        Object.values(row)[0];
                    return emailValue && typeof emailValue === 'string' && emailValue.includes('@') ? emailValue : null;
                })
                .filter(email => email);

            if (emails.length === 0) {
                return res.status(400).json({ message: "No valid email addresses found in the Excel file" });
            }

            // Get student IDs from emails
            const studentIds = await adminService.getStudentIdsByEmails(emails);

            if (studentIds.length === 0) {
                return res.status(400).json({ message: "No students found with the provided email addresses" });
            }

            // Create notification message with format: ${company_name}, ${type of update}
            const updateTypeText = getUpdateTypeText(statusUpdate);
            let message = customMessage || `${companyName}, ${updateTypeText}`;
            const notificationType = getNotificationType(statusUpdate);

            // Send notifications to all students
            await notificationService.notifyBulkStudents(studentIds, message, notificationType);

            // Update application statuses for the company
            await adminService.updateApplicationStatusesByCompany(companyName, statusUpdate, studentIds);

            res.json({
                message: "Notifications sent successfully",
                studentsNotified: studentIds.length,
                status: statusUpdate
            });

        } catch (err) {
            console.error("Error sending notifications:", err);
            res.status(500).json({ message: "Failed to send notifications" });
        }
    }
};

// Helper function to get update type text
function getUpdateTypeText(statusUpdate) {
    switch (statusUpdate) {
        case "shortlist":
            return "Shortlisted";
        case "interview_shortlist":
            return "Interview Shortlisted";
        case "selected":
            return "Selected";
        case "rejected":
            return "Rejected";
        default:
            return "Status Updated";
    }
}

// Helper function to get default message based on status
function getDefaultMessage(statusUpdate, companyName) {
    switch (statusUpdate) {
        case "shortlist":
            return `Congratulations! You have been shortlisted for ${companyName}. Please check your email for further details.`;
        case "interview_shortlist":
            return `Great news! You have been shortlisted for the interview round at ${companyName}. Please prepare well and check your email for interview details.`;
        case "selected":
            return `Congratulations! You have been selected for ${companyName}. Welcome to the team! Please check your email for next steps.`;
        case "rejected":
            return `Thank you for applying to ${companyName}. Unfortunately, you were not selected this time. Keep applying and don't give up!`;
        default:
            return `Update regarding your application at ${companyName}.`;
    }
}

// Helper function to get notification type
function getNotificationType(statusUpdate) {
    switch (statusUpdate) {
        case "shortlist":
            return "APPLICATION_STATUS_SHORTLISTED";
        case "interview_shortlist":
            return "INTERVIEW_SHORTLISTED";
        case "selected":
            return "APPLICATION_STATUS_SELECTED";
        case "rejected":
            return "APPLICATION_STATUS_REJECTED";
        default:
            return "APPLICATION_UPDATED";
    }
}
